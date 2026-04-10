package com.jade.move.repository;

import com.jade.move.model.VehicleDetected;
import com.jade.move.model.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VehicleDetectedRepository extends JpaRepository<VehicleDetected, Integer>, JpaSpecificationExecutor<VehicleDetected> {
    List<VehicleDetected> findByVehicleType(VehicleType vehicleType);
    List<VehicleDetected> findByLocationId(Integer locationId);
    List<VehicleDetected> findByTimestampBetween(LocalDateTime start, LocalDateTime end);
    List<VehicleDetected> findByVehicleTypeAndTimestampBetween(VehicleType vehicleType, LocalDateTime start, LocalDateTime end);
    List<VehicleDetected> findByLocationIdAndTimestampBetween(Integer locationId, LocalDateTime start, LocalDateTime end);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByTimestampBetween(LocalDateTime start, LocalDateTime end);

    VehicleDetected findFirstByOrderByTimestampAsc();
    VehicleDetected findFirstByOrderByTimestampDesc();
}