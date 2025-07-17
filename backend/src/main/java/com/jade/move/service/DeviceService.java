package com.jade.move.service;

import com.jade.move.model.Device;
import com.jade.move.repository.DeviceRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

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
        return deviceRepository.findById(id);
    }

    public Optional<Device> getDeviceByName(String name) {
        return Optional.ofNullable(deviceRepository.findByName(name));
    }

    public List<Device> getDevicesByType(String type) {
        return deviceRepository.findByType(type);
    }

    public List<Device> getDevicesByState(String state) {
        return deviceRepository.findByState(state);
    }

    public List<Device> getDevicesByLocationId(Integer locationId) {
        return deviceRepository.findByLocationId(locationId);
    }

    public Device createDevice(Device device) {
        return deviceRepository.save(device);
    }

    public Device updateDevice(Device device) {
        return deviceRepository.save(device);
    }

    public void deleteDevice(Integer id) {
        deviceRepository.deleteById(id);
    }
}
