package com.jade.move.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.jade.move.model.Sensor;

@Repository
public interface SensorRepository extends JpaRepository<Sensor, Integer> {
    Optional<Sensor> findByDeviceId(Integer deviceId);
    Optional<Sensor> findByMacAddress(String macAddress);
    boolean existsByMacAddress(String macAddress);
}
