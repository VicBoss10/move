package com.jade.move.service;

import com.jade.move.dto.VehicleSearchCriteria;
import com.jade.move.model.DeviceState;
import com.jade.move.model.VehicleDetected;
import com.jade.move.model.VehicleType;
import com.jade.move.repository.DeviceRepository;
import com.jade.move.repository.VehicleDetectedRepository;
import com.jade.move.specification.VehicleDetectedSpecification;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import com.jade.move.exception.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class VehicleDetectedService {

    private final VehicleDetectedRepository vehicleDetectedRepository;
    private final DeviceRepository deviceRepository;
    private final Logger log = LoggerFactory.getLogger(VehicleDetectedService.class);

    public VehicleDetectedService(VehicleDetectedRepository vehicleDetectedRepository,
                                  DeviceRepository deviceRepository) {
        this.vehicleDetectedRepository = vehicleDetectedRepository;
        this.deviceRepository = deviceRepository;
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

    public List<VehicleDetected> getVehicleDetectedByDeviceId(Integer deviceId) {
        return vehicleDetectedRepository.findByDeviceId(deviceId);
    }

    public List<VehicleDetected> getVehicleDetectedByTimestampBetween(LocalDateTime start, LocalDateTime end) {
        return vehicleDetectedRepository.findByTimestampBetween(start, end);
    }

    public List<VehicleDetected> getVehicleDetectedByVehicleTypeAndTimestampBetween(VehicleType vehicleType, LocalDateTime start, LocalDateTime end) {
        return vehicleDetectedRepository.findByVehicleTypeAndTimestampBetween(vehicleType, start, end);
    }

    public List<VehicleDetected> getVehicleDetectedByDeviceIdAndTimestampBetween(Integer deviceId, LocalDateTime start, LocalDateTime end) {
        return vehicleDetectedRepository.findByDeviceIdAndTimestampBetween(deviceId, start, end);
    }

    @Transactional
    public VehicleDetected createVehicleDetected(VehicleDetected vehicleDetected) {
        if (vehicleDetected == null) {
            throw new IllegalArgumentException("VehicleDetected cannot be null");
        }
        VehicleDetected saved = vehicleDetectedRepository.save(vehicleDetected);
        // Mark associated CAMERA device as ACTIVE
        if (saved.getDevice() != null) {
            updateDeviceStateIfInactive(saved.getDevice().getId());
        }
        return saved;
    }

    // Marks device as ACTIVE only when it is currently INACTIVE (avoids unnecessary writes).
    private void updateDeviceStateIfInactive(Integer deviceId) {
        if (deviceId == null) return;
        deviceRepository.findById(deviceId).ifPresent(device -> {
            if (device.getState() == DeviceState.INACTIVE) {
                device.setState(DeviceState.ACTIVE);
                deviceRepository.save(device);
                log.info("Device {} transitioned INACTIVE -> ACTIVE (vehicle detected)", deviceId);
            }
        });
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