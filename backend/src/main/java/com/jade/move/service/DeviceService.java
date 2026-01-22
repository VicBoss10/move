package com.jade.move.service;

import java.util.List;
import java.util.Optional;

import com.jade.move.dto.DevicesSearchCriteria;
import com.jade.move.specification.DevicesSpecification;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import com.jade.move.model.Device;
import com.jade.move.model.DeviceState;
import com.jade.move.model.DeviceType;
import com.jade.move.repository.DeviceRepository;

@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;

    public DeviceService(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    public Optional<Device> getDeviceById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Device id cannot be null");
        }
        return deviceRepository.findById(id);
    }

    public Optional<Device> getDeviceByName(String name) {
        return Optional.ofNullable(deviceRepository.findByName(name));
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
}