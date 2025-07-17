package com.jade.move.controller;

import com.jade.move.model.VehicleDetected;
import com.jade.move.model.VehicleType;
import com.jade.move.service.VehicleDetectedService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/vehicles_detected")
public class VehicleDetectedController {

    private final VehicleDetectedService vehicleDetectedService;

    public VehicleDetectedController(VehicleDetectedService vehicleDetectedService) {
        this.vehicleDetectedService = vehicleDetectedService;
    }

    @GetMapping
    public List<VehicleDetected> getAllVehicleDetected() {
        return vehicleDetectedService.getAllVehicleDetected();
    }

    @GetMapping("/{id}")
    public ResponseEntity<VehicleDetected> getVehicleDetectedById(@PathVariable Integer id) {
        Optional<VehicleDetected> vehicleDetected = vehicleDetectedService.getVehicleDetectedById(id);
        return vehicleDetected.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/type/{vehicleType}")
    public List<VehicleDetected> getVehicleDetectedByVehicleType(@PathVariable VehicleType vehicleType) {
        return vehicleDetectedService.getVehicleDetectedByVehicleType(vehicleType);
    }

    @GetMapping("/location/{locationId}")
    public List<VehicleDetected> getVehicleDetectedByLocationId(@PathVariable Integer locationId) {
        return vehicleDetectedService.getVehicleDetectedByLocationId(locationId);
    }

    @GetMapping("/range")
    public List<VehicleDetected> getVehicleDetectedByTimestampBetween(
            @RequestParam LocalDateTime start,
            @RequestParam LocalDateTime end) {
        return vehicleDetectedService.getVehicleDetectedByTimestampBetween(start, end);
    }

    @GetMapping("/type/{vehicleType}/range")
    public List<VehicleDetected> getVehicleDetectedByVehicleTypeAndTimestampBetween(
            @PathVariable VehicleType vehicleType,
            @RequestParam LocalDateTime start,
            @RequestParam LocalDateTime end) {
        return vehicleDetectedService.getVehicleDetectedByVehicleTypeAndTimestampBetween(vehicleType, start, end);
    }

    @GetMapping("/location/{locationId}/range")
    public List<VehicleDetected> getVehicleDetectedByLocationIdAndTimestampBetween(
            @PathVariable Integer locationId,
            @RequestParam LocalDateTime start,
            @RequestParam LocalDateTime end) {
        return vehicleDetectedService.getVehicleDetectedByLocationIdAndTimestampBetween(locationId, start, end);
    }

    @PostMapping
    public VehicleDetected createVehicleDetected(@RequestBody VehicleDetected vehicleDetected) {
        return vehicleDetectedService.createVehicleDetected(vehicleDetected);
    }

    @PutMapping
    public VehicleDetected updateVehicleDetected(@RequestBody VehicleDetected vehicleDetected) {
        return vehicleDetectedService.updateVehicleDetected(vehicleDetected);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVehicleDetected(@PathVariable Integer id) {
        vehicleDetectedService.deleteVehicleDetected(id);
        return ResponseEntity.noContent().build();
    }
}    