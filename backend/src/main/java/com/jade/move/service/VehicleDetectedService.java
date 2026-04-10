package com.jade.move.service;

import com.jade.move.dto.VehicleSearchCriteria;
import com.jade.move.model.VehicleDetected;
import com.jade.move.model.VehicleType;
import com.jade.move.repository.VehicleDetectedRepository;
import com.jade.move.specification.VehicleDetectedSpecification;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

import com.jade.move.exception.EntityNotFoundException;

@Service
public class VehicleDetectedService {

    private final VehicleDetectedRepository vehicleDetectedRepository;

    public VehicleDetectedService(VehicleDetectedRepository vehicleDetectedRepository) {
        this.vehicleDetectedRepository = vehicleDetectedRepository;
    }

    public List<VehicleDetected> getAllVehicleDetected() {
        return vehicleDetectedRepository.findAll();
    }

    public VehicleDetected getVehicleDetectedById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Id cannot be null");
        }
        return vehicleDetectedRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Vehicle detection not found with id: " + id));
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
        if (vehicleDetected == null) {
            throw new IllegalArgumentException("VehicleDetected cannot be null");
        }
        return vehicleDetectedRepository.save(vehicleDetected);
    }

    public VehicleDetected updateVehicleDetected(VehicleDetected vehicleDetected) {
        if (vehicleDetected == null) {
            throw new IllegalArgumentException("VehicleDetected cannot be null");
        }
        return vehicleDetectedRepository.save(vehicleDetected);
    }

    public void deleteVehicleDetected(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Id cannot be null");
        }
        vehicleDetectedRepository.deleteById(id);
    }

    public List<VehicleDetected> searchVehicles(VehicleSearchCriteria criteria) {
        Specification<VehicleDetected> spec = VehicleDetectedSpecification.buildSpecification(criteria);
        return vehicleDetectedRepository.findAll(spec);
    }

    public void deleteAllVehicleDetected() {
        vehicleDetectedRepository.deleteAll();
    }

    public void deleteVehicleDetectedByDateRange(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) throw new IllegalArgumentException("start and end cannot be null");
        vehicleDetectedRepository.deleteByTimestampBetween(start, end);
    }

    public VehicleDetected getFirstRecord() {
        return vehicleDetectedRepository.findFirstByOrderByTimestampAsc();
    }

    public VehicleDetected getLastRecord() {
        return vehicleDetectedRepository.findFirstByOrderByTimestampDesc();
    }
}