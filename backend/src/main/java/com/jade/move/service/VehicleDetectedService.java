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

/**
 * Service for vehicle detection management.
 *
 * <p>Handles CRUD operations and searches for vehicle detection records.
 * Automatically marks devices as ACTIVE when detections occur.</p>
 *
 * @since 0.0.1
 */
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

    /**
     * Retrieves all vehicle detections.
     *
     * @return list of all detections
     */
    public List<VehicleDetected> getAllVehicleDetected() {
        return vehicleDetectedRepository.findAll();
    }

    /**
     * Retrieves a vehicle detection by identifier.
     *
     * @param id detection identifier
     * @return detection record
     * @throws IllegalArgumentException if id is null
     * @throws EntityNotFoundException if not found
     */
    public VehicleDetected getVehicleDetectedById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Id cannot be null");
        }
        return vehicleDetectedRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Vehicle detection not found with id: " + id));
    }

    /**
     * Retrieves detections for a specific vehicle type.
     *
     * @param vehicleType vehicle type to filter
     * @return list of matching detections
     */
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

    /**
     * Creates a new vehicle detection record.
     *
     * @param vehicleDetected detection to persist
     * @return created record
     * @throws IllegalArgumentException if vehicleDetected is null
     */
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

    /**
     * Deletes all vehicle detections belonging to a device.
     *
     * @param deviceId device identifier whose detections will be removed
     */
    public void deleteVehicleDetectedByDeviceId(Integer deviceId) {
        if (deviceId == null) return;
        vehicleDetectedRepository.deleteByDeviceId(deviceId);
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

    /**
     * Updates an existing vehicle detection record.
     *
     * @param vehicleDetected detection with updated data
     * @return updated record
     * @throws IllegalArgumentException if vehicleDetected is null
     */
    public VehicleDetected updateVehicleDetected(VehicleDetected vehicleDetected) {
        if (vehicleDetected == null) {
            throw new IllegalArgumentException("VehicleDetected cannot be null");
        }
        return vehicleDetectedRepository.save(vehicleDetected);
    }

    /**
     * Deletes a vehicle detection by identifier.
     *
     * @param id detection identifier to delete
     * @throws IllegalArgumentException if id is null
     */
    public void deleteVehicleDetected(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Id cannot be null");
        }
        vehicleDetectedRepository.deleteById(id);
    }

    /**
     * Searches vehicle detections using flexible criteria.
     *
     * @param criteria search criteria (all optional)
     * @return list of matching detections
     */
    public List<VehicleDetected> searchVehicles(VehicleSearchCriteria criteria) {
        Specification<VehicleDetected> spec = VehicleDetectedSpecification.buildSpecification(criteria);
        return vehicleDetectedRepository.findAll(spec);
    }

    /**
     * Deletes all vehicle detection records.
     */
    public void deleteAllVehicleDetected() {
        vehicleDetectedRepository.deleteAll();
    }

    /**
     * Deletes vehicle detections within a date-time range.
     *
     * @param start start timestamp (inclusive)
     * @param end end timestamp (inclusive)
     * @throws IllegalArgumentException if start or end is null
     */
    public void deleteVehicleDetectedByDateRange(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) throw new IllegalArgumentException("start and end cannot be null");
        vehicleDetectedRepository.deleteByTimestampBetween(start, end);
    }

    /**
     * Retrieves the earliest vehicle detection record.
     *
     * @return first record by timestamp
     */
    public VehicleDetected getFirstRecord() {
        return vehicleDetectedRepository.findFirstByOrderByTimestampAsc();
    }

    /**
     * Retrieves the most recent vehicle detection record.
     *
     * @return last record by timestamp
     */
    public VehicleDetected getLastRecord() {
        return vehicleDetectedRepository.findFirstByOrderByTimestampDesc();
    }
}
