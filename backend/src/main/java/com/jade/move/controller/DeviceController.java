package com.jade.move.controller;

import com.jade.move.model.Device;
import com.jade.move.service.DeviceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/devices")
public class DeviceController {

    private final DeviceService deviceService;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @GetMapping
    public List<Device> getAllDevices() {
        return deviceService.getAllDevices();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Device> getDeviceById(@PathVariable Integer id) {
        Optional<Device> device = deviceService.getDeviceById(id);
        return device.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<Device> getDeviceByName(@PathVariable String name) {
        Optional<Device> device = deviceService.getDeviceByName(name);
        return device.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/type/{type}")
    public List<Device> getDevicesByType(@PathVariable String type) {
        return deviceService.getDevicesByType(type);
    }

    @GetMapping("/state/{state}")
    public List<Device> getDevicesByState(@PathVariable String state) {
        return deviceService.getDevicesByState(state);
    }

    @GetMapping("/location/{locationId}")
    public List<Device> getDevicesByLocationId(@PathVariable Integer locationId) {
        return deviceService.getDevicesByLocationId(locationId);
    }

    @PostMapping
    public Device createDevice(@RequestBody Device device) {
        return deviceService.createDevice(device);
    }

    @PutMapping
    public Device updateDevice(@RequestBody Device device) {
        return deviceService.updateDevice(device);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDevice(@PathVariable Integer id) {
        deviceService.deleteDevice(id);
        return ResponseEntity.noContent().build();
    }
}
