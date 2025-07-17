package com.jade.move.repository;

import com.jade.move.model.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Integer> {
    Device findByName(String name);
    List<Device> findByType(String type);
    List<Device> findByState(String state);
    List<Device> findByLocationId(Integer locationId);
    List<Device> findByTypeAndState(String type, String state);
    List<Device> findByLocationIdAndType(Integer locationId, String type);
}
