package com.jade.move.controller;

import com.jade.move.model.SensorData;
import com.jade.move.service.SensorDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/sensordata")
public class SensorDataController {

    private final SensorDataService sensorDataService;

    public SensorDataController(SensorDataService sensorDataService) {
        this.sensorDataService = sensorDataService;
    }

    @GetMapping
    public List<SensorData> getAllSensorData() {
        return sensorDataService.getAllSensorData();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SensorData> getSensorDataById(@PathVariable Integer id) {
        Optional<SensorData> sensorData = sensorDataService.getSensorDataById(id);
        return sensorData.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/device/{deviceId}")
    public List<SensorData> getSensorDataByDeviceId(@PathVariable Integer deviceId) {
        return sensorDataService.getSensorDataByDeviceId(deviceId);
    }

    @GetMapping("/range")
    public List<SensorData> getSensorDataByTimestampBetween(
            @RequestParam LocalDateTime start,
            @RequestParam LocalDateTime end) {
        return sensorDataService.getSensorDataByTimestampBetween(start, end);
    }

    @GetMapping("/device/{deviceId}/range")
    public List<SensorData> getSensorDataByDeviceIdAndTimestampBetween(
            @PathVariable Integer deviceId,
            @RequestParam LocalDateTime start,
            @RequestParam LocalDateTime end) {
        return sensorDataService.getSensorDataByDeviceIdAndTimestampBetween(deviceId, start, end);
    }

    @GetMapping("/location/{locationId}")
    public List<SensorData> getSensorDataByDeviceLocationId(@PathVariable Integer locationId) {
        return sensorDataService.getSensorDataByDeviceLocationId(locationId);
    }

    @GetMapping("/device/{deviceId}/latest")
    public ResponseEntity<SensorData> getLatestSensorDataByDeviceId(@PathVariable Integer deviceId) {
        Optional<SensorData> sensorData = sensorDataService.getLatestSensorDataByDeviceId(deviceId);
        return sensorData.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public SensorData createSensorData(@RequestBody SensorData sensorData) {
        return sensorDataService.createSensorData(sensorData);
    }

    @PutMapping
    public SensorData updateSensorData(@RequestBody SensorData sensorData) {
        return sensorDataService.updateSensorData(sensorData);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSensorData(@PathVariable Integer id) {
        sensorDataService.deleteSensorData(id);
        return ResponseEntity.noContent().build();
    }
}