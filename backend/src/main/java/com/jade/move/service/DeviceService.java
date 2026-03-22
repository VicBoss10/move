package com.jade.move.service;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import com.jade.move.dto.DevicesSearchCriteria;
import com.jade.move.dto.RegisterDeviceRequest;
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

    // Scheduler for provisioning rollback checks
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    // TTL in seconds to wait for first sensor data
    private final int provisioningTtlSeconds;

    public DeviceService(DeviceRepository deviceRepository,
                         LocationService locationService,
                         CameraService cameraService,
                         SensorService sensorService,
                         KeycloakAdminService keycloakAdminService,
                         SensorDataService sensorDataService,
                         org.springframework.core.env.Environment env) {
        this.deviceRepository = deviceRepository;
        this.locationService = locationService;
        this.cameraService = cameraService;
        this.sensorService = sensorService;
        this.keycloakAdminService = keycloakAdminService;
        this.sensorDataService = sensorDataService;

        // Read TTL config (default 60)
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

    public Device updateDevice(Device device) {
        if (device == null) {
            throw new IllegalArgumentException("Device cannot be null");
        }
        return deviceRepository.save(device);
    }

    public void deleteDevice(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Device id cannot be null");
        }
        deviceRepository.deleteById(id);
    }

    public List<Device> searchDevices(DevicesSearchCriteria criteria) {
        Specification<Device> spec = DevicesSpecification.buildSpecification(criteria);
        return deviceRepository.findAll(spec);
    }

    /**
     * Registra un dispositivo completo (Device + Camera si aplica) en una transacción
     * @param request DTO con información del dispositivo y cámara (opcional)
     * @return Device creado con ID generado
     */
    @Transactional
    public RegisterDeviceResponse registerDevice(RegisterDeviceRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("RegisterDeviceRequest cannot be null");
        }

        // Validar campos requeridos
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Device name is required");
        }
        if (request.getType() == null) {
            throw new IllegalArgumentException("Device type is required");
        }
        if (request.getLocationId() == null) {
            throw new IllegalArgumentException("Location ID is required");
        }

        // Obtener Location
        Location location = locationService.getLocationById(request.getLocationId());

        // Crear Device
        Device device = new Device();
        device.setName(request.getName());
        device.setType(request.getType());
        device.setState(request.getState() != null ? request.getState() : DeviceState.ACTIVE);
        device.setLocation(location);

        Device savedDevice = deviceRepository.save(device);

        // Si es cámara, crear también la entidad Camera
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

        // Si es sensor, crear también la entidad Sensor (similar a Camera)
        if (request.getType() == DeviceType.SENSOR) {
            // Leer campos específicos desde el mismo DTO RegisterDeviceRequest
            if (request.getMacAddress() == null || request.getMacAddress().trim().isEmpty()) {
                throw new IllegalArgumentException("macAddress is required for sensors");
            }
            if (request.getFirmwareVersion() == null || request.getFirmwareVersion().trim().isEmpty()) {
                throw new IllegalArgumentException("firmwareVersion is required for sensors");
            }

            Sensor sensor = new Sensor();
            sensor.setDevice(savedDevice);
            sensor.setMacAddress(request.getMacAddress());
            sensor.setFirmwareVersion(request.getFirmwareVersion());
            sensor.setRegisteredAt(LocalDateTime.now());

            Sensor savedSensor = sensorService.createSensor(sensor);
            // Para sensors: crear client en Keycloak y devolver credenciales en la respuesta (sin persistir)
            try {
                String baseClientName = "sensor-device-" + savedDevice.getId();
                KeycloakClientInfo clientInfo = keycloakAdminService.createClientForDevice(baseClientName);

                // Persist internal id for potential revocation
                if (clientInfo != null && clientInfo.getInternalId() != null) {
                    savedSensor.setKeycloakInternalId(clientInfo.getInternalId());
                    sensorService.updateSensor(savedSensor);
                }

                // If device was created as PROVISIONAL, schedule rollback check
                if (savedDevice.getState() == DeviceState.PROVISIONAL) {
                    LocalDateTime registeredAt = savedSensor.getRegisteredAt();
                    scheduleProvisioningRollback(savedDevice.getId(), savedSensor.getId(), clientInfo != null ? clientInfo.getInternalId() : null, registeredAt);
                }

                RegisterDeviceResponse resp = new RegisterDeviceResponse(savedDevice.getId(), "Device registered successfully");
                resp.setKeycloakClientInfo(clientInfo);
                return resp;
            } catch (Exception e) {
                throw new RuntimeException("Failed to create Keycloak client for sensor: " + e.getMessage(), e);
            }
            // Nota: request.getWifiPassword() / getWifiSsid() están disponibles pero no se persisten;
            // se usan para provisioning transaccional desde frontend hacia ESP32 si corresponde.
        }

        RegisterDeviceResponse resp = new RegisterDeviceResponse(savedDevice.getId(), "Device registered successfully");
        return resp;
    }

    /**
     * Programa una tarea que espera el TTL y verifica si llegó al menos un dato
     * de sensor para el dispositivo provisionado. Si no llega, realiza rollback
     * (elimina sensor, dispositivo y revoca client en Keycloak).
     */
    private void scheduleProvisioningRollback(Integer deviceId, Integer sensorId, String keycloakInternalId, LocalDateTime registeredAt) {
        if (deviceId == null || sensorId == null) return;
        log.info("Scheduling provisioning rollback for device {} in {} seconds", deviceId, provisioningTtlSeconds);
        scheduler.schedule(() -> {
            try {
                Optional<SensorData> latestOpt = sensorDataService.getLatestSensorDataByDeviceId(deviceId);
                boolean hasRecent = latestOpt.isPresent() && latestOpt.get().getTimestamp().isAfter(registeredAt);

                if (!hasRecent) {
                    log.info("No sensor data received for device {} within TTL, performing rollback", deviceId);
                    performProvisioningRollback(deviceId, sensorId, keycloakInternalId);
                } else {
                    log.info("Sensor data received for device {}; marking ACTIVE", deviceId);
                    Device d = deviceRepository.findById(deviceId).orElse(null);
                    if (d != null) {
                        d.setState(DeviceState.ACTIVE);
                        deviceRepository.save(d);
                    }
                }
            } catch (Exception e) {
                log.error("Error during provisioning rollback check for device {}: {}", deviceId, e.getMessage());
            }
        }, provisioningTtlSeconds, TimeUnit.SECONDS);
    }

    @Transactional
    protected void performProvisioningRollback(Integer deviceId, Integer sensorId, String keycloakInternalId) {
        try {
            // attempt to delete sensor first
            try {
                sensorService.deleteSensor(sensorId);
            } catch (Exception e) {
                log.warn("Failed to delete sensor {} during rollback: {}", sensorId, e.getMessage());
            }

            // revoke keycloak client if available
            try {
                keycloakAdminService.deleteClientByInternalId(keycloakInternalId);
            } catch (Exception e) {
                log.warn("Failed to delete Keycloak client {} during rollback: {}", keycloakInternalId, e.getMessage());
            }

            // finally delete device record
            try {
                deviceRepository.deleteById(deviceId);
            } catch (Exception e) {
                log.warn("Failed to delete device {} during rollback: {}", deviceId, e.getMessage());
            }
        } catch (Exception e) {
            log.error("Error performing provisioning rollback for device {}: {}", deviceId, e.getMessage());
            throw e;
        }
    }
}