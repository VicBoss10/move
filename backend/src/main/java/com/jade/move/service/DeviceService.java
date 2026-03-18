package com.jade.move.service;

import java.util.List;

import com.jade.move.dto.DevicesSearchCriteria;
import com.jade.move.dto.RegisterDeviceRequest;
import com.jade.move.exception.EntityNotFoundException;
import com.jade.move.model.*;
import com.jade.move.specification.DevicesSpecification;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import com.jade.move.repository.DeviceRepository;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final LocationService locationService;
    private final CameraService cameraService;

    public DeviceService(DeviceRepository deviceRepository, 
                        LocationService locationService,
                        CameraService cameraService) {
        this.deviceRepository = deviceRepository;
        this.locationService = locationService;
        this.cameraService = cameraService;
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
    public Device registerDevice(RegisterDeviceRequest request) {
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
        
        return savedDevice;
    }
}