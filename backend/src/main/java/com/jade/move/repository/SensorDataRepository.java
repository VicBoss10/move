package com.jade.move.repository;

import com.jade.move.model.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SensorDataRepository extends JpaRepository<SensorData, Integer>, JpaSpecificationExecutor<SensorData> {
    List<SensorData> findByDeviceId(Integer deviceId);
    List<SensorData> findByTimestampBetween(LocalDateTime start, LocalDateTime end);
    List<SensorData> findByDeviceIdAndTimestampBetween(Integer deviceId, LocalDateTime start, LocalDateTime end);
    List<SensorData> findByDeviceLocationId(Integer locationId);
    SensorData findTopByDeviceIdOrderByTimestampDesc(Integer deviceId);
}