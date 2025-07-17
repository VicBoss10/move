package com.jade.move.repository;

import com.jade.move.model.VehicleDetected;
import com.jade.move.model.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VehicleDetectedRepository extends JpaRepository<VehicleDetected, Integer> {
    List<VehicleDetected> findByVehicleType(VehicleType vehicleType);
    List<VehicleDetected> findByLocationId(Integer locationId);
    List<VehicleDetected> findByTimestampBetween(LocalDateTime start, LocalDateTime end);
    List<VehicleDetected> findByVehicleTypeAndTimestampBetween(VehicleType vehicleType, LocalDateTime start, LocalDateTime end);
    List<VehicleDetected> findByLocationIdAndTimestampBetween(Integer locationId, LocalDateTime start, LocalDateTime end);
}