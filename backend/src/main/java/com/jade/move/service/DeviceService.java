package com.jade.move.service;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import com.jade.move.dto.DevicesSearchCriteria;
import com.jade.move.dto.RegisterDeviceRequest;
import com.jade.move.exception.ConflictException;
import com.jade.move.exception.EntityNotFoundException;
import com.jade.move.model.*;
import com.jade.move.specification.DevicesSpecification;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import com.jade.move.repository.DeviceRepository;
import org.springframework.transaction.annotation.Transactional;
import com.jade.move.dto.KeycloakClientInfo;
import com.jade.move.dto.RegisterDeviceResponse;

@Service
public class DeviceService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(DeviceService.class);

    private final DeviceRepository deviceRepository;
    private final LocationService locationService;
    private final CameraService cameraService;
    private final SensorService sensorService;
    private final KeycloakAdminService keycloakAdminService;
    private final SensorDataService sensorDataService;
    private final VehicleDetectedService vehicleDetectedService;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    private final int provisioningTtlSeconds;

    public DeviceService(DeviceRepository deviceRepository,
                         LocationService locationService,
                         CameraService cameraService,
                         SensorService sensorService,
                         KeycloakAdminService keycloakAdminService,
                         SensorDataService sensorDataService,
                         VehicleDetectedService vehicleDetectedService,
                         org.springframework.core.env.Environment env) {
        this.deviceRepository = deviceRepository;
        this.locationService = locationService;
        this.cameraService = cameraService;
        this.sensorService = sensorService;
        this.keycloakAdminService = keycloakAdminService;
        this.sensorDataService = sensorDataService;
        this.vehicleDetectedService = vehicleDetectedService;

        String ttlProp = env.getProperty("provisioning.ttl-seconds", "60");
        int ttl = 60;
        try {
            ttl = Integer.parseInt(ttlProp);
        } catch (NumberFormatException e) {
            log.warn("Invalid provisioning.ttl-seconds value '{}', using default 60s", ttlProp);
        }
        this.provisioningTtlSeconds = ttl;
    }

    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    public Device getDeviceById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Device id cannot be null");
        }
        return deviceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Device not found with id: " + id));
    }

    public Device getDeviceByName(String name) {
        Device device = deviceRepository.findByName(name);
        if (device == null) {
            throw new EntityNotFoundException("Device not found with name: " + name);
        }
        return device;
    }

    public List<Device> getDevicesByType(DeviceType type) {
        return deviceRepository.findByType(type);
    }

    public List<Device> getDevicesByState(DeviceState state) {
        return deviceRepository.findByState(state);
    }

    public List<Device> getDevicesByLocationId(Integer locationId) {
        return deviceRepository.findByLocationId(locationId);
    }

    public Device createDevice(Device device) {
        if (device == null) {
            throw new IllegalArgumentException("Device cannot be null");
        }
        return deviceRepository.save(device);
    }

    /**
     * Updates an existing device.
     *
     * <p>Supports partial updates (e.g., location-only from firmware)
     * by loading the existing entity and selectively applying changes
     * to prevent overwriting with null values.</p>
     *
     * @param device device with updated values
     * @return updated device
     * @throws IllegalArgumentException if device is null
     * @throws EntityNotFoundException if device not found
     */
    public Device updateDevice(Device device) {
        if (device == null) {
            throw new IllegalArgumentException("Device cannot be null");
        }
        Device existing = deviceRepository.findById(device.getId())
                .orElseThrow(() -> new EntityNotFoundException("Device not found with id: " + device.getId()));
        if (device.getName() != null) existing.setName(device.getName());
        if (device.getType() != null) existing.setType(device.getType());
        if (device.getState() != null) existing.setState(device.getState());
        if (device.getLocation() != null) existing.setLocation(device.getLocation());
        return deviceRepository.save(existing);
    }

    /**
     * Deletes a device and its dependent entities.
     *
     * <p>Cascade-deletes associated camera, sensor, and sensor data
     * before removing the device.</p>
     *
     * @param id device identifier to delete
     * @throws IllegalArgumentException if id is null
     */
    @Transactional
    public void deleteDevice(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Device id cannot be null");
        }

        try {
            Camera camera = cameraService.getCameraByDeviceId(id);
            if (camera != null) {
                cameraService.deleteCamera(camera.getId());
            }
        } catch (Exception ignored) {
            // Camera may not exist for this device
        }

        try {
            Sensor sensor = sensorService.getSensorByDeviceId(id);
            if (sensor != null) {
                deleteKeycloakClientForSensor(sensor);
                sensorService.deleteSensor(sensor.getId());
            }
        } catch (Exception ignored) {
            // Sensor may not exist for this device
        }

        sensorDataService.deleteSensorDataByDeviceId(id);
        vehicleDetectedService.deleteVehicleDetectedByDeviceId(id);
        deviceRepository.deleteById(id);
    }

    /**
     * Archives ("moves") a device without deleting it or its data.
     *
     * <p>Deletes the sensor's Keycloak client so its credentials stop working
     * and marks the device as archived. Historical data and location are kept
     * intact. The physical unit is signaled to return to provisioning mode
     * (rejected sensor data and startup verification), so it can be registered
     * again as a new device at a new location.</p>
     *
     * @param id device identifier to archive
     * @throws IllegalArgumentException if id is null
     * @throws EntityNotFoundException if device not found
     */
    @Transactional
    public void moveDevice(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Device id cannot be null");
        }

        Device device = deviceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Device not found with id: " + id));

        if (device.getType() != DeviceType.SENSOR) {
            throw new IllegalArgumentException("Only sensor devices can be moved");
        }

        try {
            Sensor sensor = sensorService.getSensorByDeviceId(id);
            if (sensor != null) {
                deleteKeycloakClientForSensor(sensor);
            }
        } catch (Exception ignored) {
            // Sensor may not exist for this device
        }

        device.setArchived(true);
        device.setState(DeviceState.INACTIVE);
        deviceRepository.save(device);
    }

    /**
     * Deletes the Keycloak client associated with a sensor, if any.
     */
    private void deleteKeycloakClientForSensor(Sensor sensor) {
        if (sensor == null || sensor.getKeycloakInternalId() == null) {
            return;
        }
        try {
            keycloakAdminService.deleteClientByInternalId(sensor.getKeycloakInternalId());
        } catch (Exception e) {
            log.warn("Failed to delete Keycloak client {} for sensor {}: {}",
                    sensor.getKeycloakInternalId(), sensor.getId(), e.getMessage());
        }
    }

    public List<Device> searchDevices(DevicesSearchCriteria criteria) {
        Specification<Device> spec = DevicesSpecification.buildSpecification(criteria);
        return deviceRepository.findAll(spec);
    }

    /**
     * Registers a new device (and camera if applicable) in a transaction.
     *
     * <p>Creates a Device entity along with a Camera entity if the device
     * type is CAMERA.</p>
     *
     * @param request registration request with device and optional camera data
     * @return registration response with created device id
     * @throws IllegalArgumentException if required fields are missing
     * @throws EntityNotFoundException if location not found
     */
    @Transactional
    public RegisterDeviceResponse registerDevice(RegisterDeviceRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("RegisterDeviceRequest cannot be null");
        }

        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Device name is required");
        }
        if (request.getType() == null) {
            throw new IllegalArgumentException("Device type is required");
        }
        if (request.getLocationId() == null) {
            throw new IllegalArgumentException("Location ID is required");
        }

        Location location = locationService.getLocationById(request.getLocationId());

        Device device = new Device();
        device.setName(request.getName());
        device.setType(request.getType());
        device.setState(request.getState() != null ? request.getState() : DeviceState.ACTIVE);
        device.setLocation(location);

        Device savedDevice = deviceRepository.save(device);

        if (request.getType() == DeviceType.CAMERA) {
            if (request.getStreamType() == null) {
                throw new IllegalArgumentException("StreamType is required for cameras");
            }
            if (request.getSource() == null || request.getSource().trim().isEmpty()) {
                throw new IllegalArgumentException("Source is required for cameras");
            }

            Camera camera = new Camera();
            camera.setDevice(savedDevice);
            camera.setStreamType(request.getStreamType());
            camera.setSource(request.getSource());

            cameraService.createCamera(camera);
        }

        if (request.getType() == DeviceType.SENSOR) {
            if (request.getMacAddress() == null || request.getMacAddress().trim().isEmpty()) {
                throw new IllegalArgumentException("macAddress is required for sensors");
            }
            if (request.getFirmwareVersion() == null || request.getFirmwareVersion().trim().isEmpty()) {
                throw new IllegalArgumentException("firmwareVersion is required for sensors");
            }

            // If this MAC already belongs to a moved (archived) device, release it so the
            // same physical unit can register again; otherwise it is a genuine duplicate.
            Sensor existingByMac = sensorService.findByMacAddress(request.getMacAddress());
            if (existingByMac != null) {
                Device existingDevice = existingByMac.getDevice();
                if (existingDevice != null && Boolean.TRUE.equals(existingDevice.getArchived())) {
                    sensorService.deleteSensorKeepingData(existingByMac.getId());
                } else {
                    throw new ConflictException("A sensor with MAC address " + request.getMacAddress() + " is already registered");
                }
            }

            Sensor sensor = new Sensor();
            sensor.setDevice(savedDevice);
            sensor.setMacAddress(request.getMacAddress());
            sensor.setFirmwareVersion(request.getFirmwareVersion());
            sensor.setRegisteredAt(LocalDateTime.now());

            Sensor savedSensor = sensorService.createSensor(sensor);
            try {
                String baseClientName = "sensor-device-" + savedDevice.getId();
                KeycloakClientInfo clientInfo = keycloakAdminService.createClientForDevice(baseClientName);

                if (clientInfo != null && clientInfo.getInternalId() != null) {
                    savedSensor.setKeycloakInternalId(clientInfo.getInternalId());
                    sensorService.updateSensor(savedSensor);
                }

                if (savedDevice.getState() == DeviceState.PROVISIONAL) {
                    scheduleProvisioningRollback(savedDevice.getId(), savedSensor.getId(), clientInfo != null ? clientInfo.getInternalId() : null);
                }

                RegisterDeviceResponse resp = new RegisterDeviceResponse(savedDevice.getId(), "Device registered successfully");
                resp.setKeycloakClientInfo(clientInfo);
                return resp;
            } catch (Exception e) {
                throw new RuntimeException("Failed to create Keycloak client for sensor: " + e.getMessage(), e);
            }
        }

        RegisterDeviceResponse resp = new RegisterDeviceResponse(savedDevice.getId(), "Device registered successfully");
        return resp;
    }

    /**
     * Schedules a task to wait for the TTL and verify if at least one sensor data
     * point arrived for the provisioned device. If not, performs rollback
     * (deletes sensor, device, and revokes Keycloak client).
     */
    private void scheduleProvisioningRollback(Integer deviceId, Integer sensorId, String keycloakInternalId) {
        if (deviceId == null || sensorId == null) return;
        log.info("Scheduling provisioning rollback for device {} in {} seconds", deviceId, provisioningTtlSeconds);
        scheduler.schedule(() -> {
            try {
                log.info("Provisioning validation: Checking if ANY sensor data arrived for device {}", deviceId);
                Optional<SensorData> latestOpt = sensorDataService.getLatestSensorDataByDeviceId(deviceId);

                if (latestOpt.isPresent()) {
                    log.info("✓ Sensor data found for device {}, marking ACTIVE", deviceId);
                    Device d = deviceRepository.findById(deviceId).orElse(null);
                    if (d != null) {
                        d.setState(DeviceState.ACTIVE);
                        deviceRepository.save(d);
                    }
                } else {
                    log.warn("✗ No sensor data for device {} after TTL, performing rollback", deviceId);
                    performProvisioningRollback(deviceId, sensorId, keycloakInternalId);
                }
            } catch (Exception e) {
                log.error("Error during provisioning validation for device {}: {}", deviceId, e.getMessage(), e);
            }
        }, provisioningTtlSeconds, TimeUnit.SECONDS);
    }

    @Transactional
    protected void performProvisioningRollback(Integer deviceId, Integer sensorId, String keycloakInternalId) {
        try {
            // revoke keycloak client if available
            try {
                keycloakAdminService.deleteClientByInternalId(keycloakInternalId);
            } catch (Exception e) {
                log.warn("Failed to delete Keycloak client {} during rollback: {}", keycloakInternalId, e.getMessage());
            }

            // Ensure sensor data for this device is removed first to avoid FK violations
            try {
                sensorDataService.deleteSensorDataByDeviceId(deviceId);
            } catch (Exception e) {
                log.warn("Failed to delete sensor_data for device {} during rollback: {}", deviceId, e.getMessage());
            }

            // Delete device using deleteDevice() which handles sensor/camera dependencies properly
            try {
                deleteDevice(deviceId);
            } catch (Exception e) {
                log.warn("Failed to delete device {} during rollback: {}", deviceId, e.getMessage());
            }
        } catch (Exception e) {
            log.error("Error performing provisioning rollback for device {}: {}", deviceId, e.getMessage());
            throw e;
        }
    }
}
