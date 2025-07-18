package com.jade.move.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jade.move.model.Device;
import com.jade.move.service.DeviceService;

@RestController
@RequestMapping("/devices")
public class DeviceController {

    private final DeviceService deviceService;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @GetMapping
    public ResponseEntity<?> getAllDevices() {
        List<Device> devices = deviceService.getAllDevices();
        if (devices.isEmpty()) {
            return ResponseEntity.ok("No devices found.");
        }
        return ResponseEntity.ok(devices);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDeviceById(@PathVariable Integer id) {
        Optional<Device> device = deviceService.getDeviceById(id);
        if (device.isPresent()) {
            return ResponseEntity.ok(device.get());
        } else {
            return ResponseEntity.status(404).body("Device not found with id: " + id);
        }
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<?> getDeviceByName(@PathVariable String name) {
        Optional<Device> device = deviceService.getDeviceByName(name);
        if (device.isPresent()) {
            return ResponseEntity.ok(device.get());
        } else {
            return ResponseEntity.status(404).body("Device not found with name: " + name);
        }
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<?> getDevicesByType(@PathVariable String type) {
        List<Device> devices = deviceService.getDevicesByType(type);
        if (devices.isEmpty()) {
            return ResponseEntity.ok("No devices found with type: " + type);
        }
        return ResponseEntity.ok(devices);
    }

    @GetMapping("/state/{state}")
    public ResponseEntity<?> getDevicesByState(@PathVariable String state) {
        List<Device> devices = deviceService.getDevicesByState(state);
        if (devices.isEmpty()) {
            return ResponseEntity.ok("No devices found with state: " + state);
        }
        return ResponseEntity.ok(devices);
    }

    @GetMapping("/location/{locationId}")
    public ResponseEntity<?> getDevicesByLocationId(@PathVariable Integer locationId) {
        List<Device> devices = deviceService.getDevicesByLocationId(locationId);
        if (devices.isEmpty()) {
            return ResponseEntity.ok("No devices found for location id: " + locationId);
        }
        return ResponseEntity.ok(devices);
    }

    @PostMapping
    public ResponseEntity<?> createDevice(@RequestBody Device device) {
        Device createdDevice = deviceService.createDevice(device);
        return ResponseEntity.ok("Device created successfully with id: " + createdDevice.getId());
    }

    @PutMapping
    public ResponseEntity<?> updateDevice(@RequestBody Device device) {
        Device updatedDevice = deviceService.updateDevice(device);
        return ResponseEntity.ok("Device updated successfully with id: " + updatedDevice.getId());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDevice(@PathVariable Integer id) {
        deviceService.deleteDevice(id);
        return ResponseEntity.ok("Device deleted successfully with id: " + id);
    }
}