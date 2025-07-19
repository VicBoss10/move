package com.jade.move.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.jade.move.model.Device;
import com.jade.move.model.DeviceState;
import com.jade.move.model.DeviceType;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Integer> {
    Device findByName(String name);
    List<Device> findByType(DeviceType type);
    List<Device> findByState(DeviceState state);
    List<Device> findByLocationId(Integer locationId);
    List<Device> findByTypeAndState(DeviceType type, DeviceState state);
    List<Device> findByLocationIdAndType(Integer locationId, DeviceType type);
}
