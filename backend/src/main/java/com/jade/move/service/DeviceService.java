package com.jade.move.service;

import java.util.List;
import java.time.LocalDateTime;

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

    private final DeviceRepository deviceRepository;
    private final LocationService locationService;
    private final CameraService cameraService;
    private final SensorService sensorService;
    private final KeycloakAdminService keycloakAdminService;

    public DeviceService(DeviceRepository deviceRepository,
                        LocationService locationService,
                        CameraService cameraService,
                        SensorService sensorService,
                        KeycloakAdminService keycloakAdminService) {
        this.deviceRepository = deviceRepository;
        this.locationService = locationService;
        this.cameraService = cameraService;
        this.sensorService = sensorService;
        this.keycloakAdminService = keycloakAdminService;
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

            sensorService.createSensor(sensor);
            // Para sensors: crear client en Keycloak y devolver credenciales en la respuesta (sin persistir)
            try {
                String baseClientName = "sensor-device-" + savedDevice.getId();
                KeycloakClientInfo clientInfo = keycloakAdminService.createClientForDevice(baseClientName);

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
}