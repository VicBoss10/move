package com.jade.move.service;

import com.jade.move.model.VehicleDetected;
import com.jade.move.model.VehicleType;
import com.jade.move.repository.VehicleDetectedRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class VehicleDetectedService {

    private final VehicleDetectedRepository vehicleDetectedRepository;

    public VehicleDetectedService(VehicleDetectedRepository vehicleDetectedRepository) {
        this.vehicleDetectedRepository = vehicleDetectedRepository;
    }

    public List<VehicleDetected> getAllVehicleDetected() {
        return vehicleDetectedRepository.findAll();
    }

    public Optional<VehicleDetected> getVehicleDetectedById(Integer id) {
        return vehicleDetectedRepository.findById(id);
    }

    public List<VehicleDetected> getVehicleDetectedByVehicleType(VehicleType vehicleType) {
        return vehicleDetectedRepository.findByVehicleType(vehicleType);
    }

    public List<VehicleDetected> getVehicleDetectedByLocationId(Integer locationId) {
        return vehicleDetectedRepository.findByLocationId(locationId);
    }

    public List<VehicleDetected> getVehicleDetectedByTimestampBetween(LocalDateTime start, LocalDateTime end) {
        return vehicleDetectedRepository.findByTimestampBetween(start, end);
    }

    public List<VehicleDetected> getVehicleDetectedByVehicleTypeAndTimestampBetween(VehicleType vehicleType, LocalDateTime start, LocalDateTime end) {
        return vehicleDetectedRepository.findByVehicleTypeAndTimestampBetween(vehicleType, start, end);
    }

    public List<VehicleDetected> getVehicleDetectedByLocationIdAndTimestampBetween(Integer locationId, LocalDateTime start, LocalDateTime end) {
        return vehicleDetectedRepository.findByLocationIdAndTimestampBetween(locationId, start, end);
    }

    public VehicleDetected createVehicleDetected(VehicleDetected vehicleDetected) {
        return vehicleDetectedRepository.save(vehicleDetected);
    }

    public VehicleDetected updateVehicleDetected(VehicleDetected vehicleDetected) {
        return vehicleDetectedRepository.save(vehicleDetected);
    }

    public void deleteVehicleDetected(Integer id) {
        vehicleDetectedRepository.deleteById(id);
    }
}