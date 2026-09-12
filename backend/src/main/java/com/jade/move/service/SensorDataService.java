package com.jade.move.service;

import com.jade.move.dto.SensorDataSearchCriteria;
import com.jade.move.model.Device;
import com.jade.move.model.DeviceState;
import com.jade.move.model.SensorData;
import com.jade.move.repository.DeviceRepository;
import com.jade.move.repository.SensorDataRepository;
import com.jade.move.specification.SensorDataSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.jade.move.exception.EntityNotFoundException;
import com.jade.move.exception.BadRequestException;
import com.jade.move.exception.DeviceArchivedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Set;
import java.util.LinkedHashSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.ArrayList;

/**
 * Service for sensor data management.
 *
 * <p>Handles ingestion, retrieval, searching, and deletion of sensor data.
 * Includes validation logic that rejects records with sentinel value -1,
 * tracking consecutive rejections and updating device state accordingly.</p>
 *
 * @since 0.0.1
 */
@Service
public class SensorDataService {

    private final SensorDataRepository sensorDataRepository;
    private final DeviceRepository deviceRepository;
    private final Logger log = LoggerFactory.getLogger(SensorDataService.class);

    // tracks consecutive rejected sensor posts per deviceId (in-memory only)
    private final Map<Integer, Integer> consecutiveRejectedByDevice = new ConcurrentHashMap<>();

    public SensorDataService(SensorDataRepository sensorDataRepository,
                             DeviceRepository deviceRepository) {
        this.sensorDataRepository = sensorDataRepository;
        this.deviceRepository = deviceRepository;
    }

    /**
     * Bulk creates sensor data records.
     *
     * <p>Persists all records and then post-processes to delete entries
     * with invalid sentinel values, updating device state if needed.</p>
     *
     * @param sensorDataList list of sensor data to persist
     * @return list of saved records
     */
    public List<SensorData> createBulkSensorData(List<SensorData> sensorDataList) {
        if (sensorDataList == null || sensorDataList.isEmpty()) return new ArrayList<>();

        // Reject the whole batch if its device has been archived ("moved")
        for (SensorData s : sensorDataList) {
            Integer deviceId = s.getDevice() != null ? s.getDevice().getId() : null;
            assertDeviceNotArchived(deviceId);
        }

        // Step 1: Persist all records as received — no filtering
        List<SensorData> saved = new ArrayList<>(sensorDataList.size());
        for (SensorData s : sensorDataList) {
            saved.add(sensorDataRepository.save(s));
        }
        log.info("[BULK] Received and persisted {} records", saved.size());

        // Step 2: Post-process in order — delete invalids, track consecutive counters
        int totalDeleted = 0;
        Set<Integer> failingDevices = new LinkedHashSet<>();
        for (SensorData s : saved) {
            Integer deviceId = s.getDevice() != null ? s.getDevice().getId() : null;
            if (containsInvalidSentinel(s)) {
                log.warn("[BULK] Sentinel -1 in record id={} device={} — deleting", s.getId(), deviceId);
                sensorDataRepository.deleteById(s.getId());
                totalDeleted++;
                int count = incrementRejectedCount(deviceId);
                if (count >= 6) {
                    log.error("[BULK] Device {} has {} consecutive sentinel records — marking FAILING", deviceId, count);
                    updateDeviceState(deviceId, DeviceState.FAILING);
                    if (deviceId != null) failingDevices.add(deviceId);
                } else {
                    log.warn("[BULK] Device {} consecutive sentinel count: {}", deviceId, count);
                }
            } else {
                resetRejectedCount(deviceId);
                updateDeviceStateIfInactive(deviceId);
            }
        }

        log.info("[BULK] Post-processing done — received={} persisted={} deleted={} failingDevices={}",
                saved.size(), saved.size() - totalDeleted, totalDeleted, failingDevices);
        return saved;
    }

    /**
     * Retrieves all sensor data records.
     *
     * @return list of all records
     */
    public List<SensorData> getAllSensorData() {
        return sensorDataRepository.findAll();
    }

    /**
     * Retrieves a sensor data record by identifier.
     *
     * @param id sensor data id
     * @return sensor data record
     * @throws IllegalArgumentException if id is null
     * @throws EntityNotFoundException if not found
     */
    public SensorData getSensorDataById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("SensorData id cannot be null");
        }
        return sensorDataRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sensor data not found with id: " + id));
    }

    /**
     * Retrieves all sensor data for a device.
     *
     * @param deviceId device identifier
     * @return list of sensor data for the device
     */
    public List<SensorData> getSensorDataByDeviceId(Integer deviceId) {
        return sensorDataRepository.findByDeviceId(deviceId);
    }

    public List<SensorData> getSensorDataByTimestampBetween(LocalDateTime start, LocalDateTime end) {
        return sensorDataRepository.findByTimestampBetween(start, end);
    }

    public List<SensorData> getSensorDataByDeviceIdAndTimestampBetween(Integer deviceId, LocalDateTime start, LocalDateTime end) {
        return sensorDataRepository.findByDeviceIdAndTimestampBetween(deviceId, start, end);
    }

    public List<SensorData> getSensorDataByDeviceLocationId(Integer locationId) {
        return sensorDataRepository.findByDeviceLocationId(locationId);
    }

    public Optional<SensorData> getLatestSensorDataByDeviceId(Integer deviceId) {
        return Optional.ofNullable(sensorDataRepository.findTopByDeviceIdOrderByTimestampDesc(deviceId));
    }

    /**
     * Creates a new sensor data record.
     *
     * <p>Rejects records containing sentinel value -1 and tracks consecutive
     * rejections to detect sensor failures.</p>
     *
     * @param sensorData sensor data to persist
     * @return created record
     * @throws IllegalArgumentException if sensorData is null
     * @throws BadRequestException if record contains invalid sentinel value
     */
    @Transactional
    public SensorData createSensorData(SensorData sensorData) {
        if (sensorData == null) {
            throw new IllegalArgumentException("SensorData cannot be null");
        }
        Integer deviceId = sensorData.getDevice() != null ? sensorData.getDevice().getId() : null;
        assertDeviceNotArchived(deviceId);
        if (containsInvalidSentinel(sensorData)) {
            int count = incrementRejectedCount(deviceId);
            log.warn("Rejected sensor data for device {}. consecutive rejects={}", deviceId, count);
            if (count >= 6) {
                log.error("Device {} has {} consecutive rejected sensor data entries — possible sensor failure", deviceId, count);
                updateDeviceState(deviceId, DeviceState.FAILING);
            }
            throw new BadRequestException("Sensor data contains invalid sentinel value -1 and will not be accepted");
        }
        // accepted -> reset consecutive rejected counter and ensure device is ACTIVE
        resetRejectedCount(deviceId);
        updateDeviceStateIfInactive(deviceId);
        return sensorDataRepository.save(sensorData);
    }

    /**
     * Updates an existing sensor data record.
     *
     * @param sensorData sensor data with updated values
     * @return updated record
     * @throws IllegalArgumentException if sensorData is null
     * @throws BadRequestException if record contains invalid sentinel value
     */
    @Transactional
    public SensorData updateSensorData(SensorData sensorData) {
        if (sensorData == null) {
            throw new IllegalArgumentException("SensorData cannot be null");
        }
        Integer deviceId = sensorData.getDevice() != null ? sensorData.getDevice().getId() : null;
        if (containsInvalidSentinel(sensorData)) {
            int count = incrementRejectedCount(deviceId);
            log.warn("Rejected sensor data update for device {}. consecutive rejects={}", deviceId, count);
            if (count >= 6) {
                log.error("Device {} has {} consecutive rejected sensor data updates — possible sensor failure", deviceId, count);
                updateDeviceState(deviceId, DeviceState.FAILING);
            }
            throw new BadRequestException("Sensor data contains invalid sentinel value -1 and will not be accepted");
        }
        resetRejectedCount(deviceId);
        updateDeviceStateIfInactive(deviceId);
        return sensorDataRepository.save(sensorData);
    }

    // --- Device state helpers ---

    /**
     * Marks device as ACTIVE only when it is currently INACTIVE.
     * Avoids unnecessary database writes.
     *
     * @param deviceId device identifier
     * @implNote Updates device state if it transitions from INACTIVE to ACTIVE
     */
    /**
     * Rejects data addressed to an archived ("moved") device.
     *
     * <p>Throws {@link DeviceArchivedException} (HTTP 410 Gone) so the physical
     * unit knows it must return to provisioning mode instead of keeping data
     * flowing to its old location.</p>
     */
    private void assertDeviceNotArchived(Integer deviceId) {
        if (deviceId == null) return;
        boolean archived = deviceRepository.findById(deviceId)
                .map(Device::getArchived)
                .map(Boolean.TRUE::equals)
                .orElse(false);
        if (archived) {
            throw new DeviceArchivedException("Device " + deviceId + " is archived and no longer accepts sensor data");
        }
    }

    private void updateDeviceStateIfInactive(Integer deviceId) {
        if (deviceId == null) return;
        deviceRepository.findById(deviceId).ifPresent(device -> {
            if (device.getState() == DeviceState.INACTIVE || device.getState() == DeviceState.PROVISIONAL) {
                device.setState(DeviceState.ACTIVE);
                deviceRepository.save(device);
                log.info("Device {} transitioned {} -> ACTIVE (data received)", deviceId, device.getState());
            }
        });
    }

    /**
     * Unconditionally sets the device state.
     * Used for marking devices as FAILING.
     *
     * @param deviceId device identifier
     * @param newState target device state
     */
    void updateDeviceState(Integer deviceId, DeviceState newState) {
        if (deviceId == null) return;
        deviceRepository.findById(deviceId).ifPresent(device -> {
            if (device.getState() != newState) {
                DeviceState previous = device.getState();
                device.setState(newState);
                deviceRepository.save(device);
                log.warn("Device {} state changed {} -> {}", deviceId, previous, newState);
            }
        });
    }

    private boolean containsInvalidSentinel(SensorData s) {
        if (s == null) return false;
        return (s.getTemperature() != null && Double.compare(s.getTemperature(), -1.0) == 0)
                || (s.getHumidity() != null && Double.compare(s.getHumidity(), -1.0) == 0)
                || (s.getCo2() != null && Double.compare(s.getCo2(), -1.0) == 0)
                || (s.getPm25() != null && Double.compare(s.getPm25(), -1.0) == 0)
                || (s.getPm10() != null && Double.compare(s.getPm10(), -1.0) == 0)
                || (s.getCo() != null && Double.compare(s.getCo(), -1.0) == 0)
                || (s.getNo2() != null && Double.compare(s.getNo2(), -1.0) == 0)
                || (s.getNh3() != null && Double.compare(s.getNh3(), -1.0) == 0);
    }

    private int incrementRejectedCount(Integer deviceId) {
        if (deviceId == null) return 0;
        return consecutiveRejectedByDevice.merge(deviceId, 1, Integer::sum);
    }

    private void resetRejectedCount(Integer deviceId) {
        if (deviceId == null) return;
        consecutiveRejectedByDevice.remove(deviceId);
    }

    /**
     * Deletes a sensor data record by identifier.
     *
     * @param id record identifier to delete
     * @throws IllegalArgumentException if id is null
     */
    public void deleteSensorData(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Id cannot be null");
        }
        sensorDataRepository.deleteById(id);
    }

    /**
     * Deletes all sensor data for a given device.
     *
     * @param deviceId device identifier
     */
    public void deleteSensorDataByDeviceId(Integer deviceId) {
        if (deviceId == null) return;
        sensorDataRepository.deleteByDeviceId(deviceId);
    }

    /**
     * Deletes all sensor data records.
     */
    public void deleteAllSensorData() {
        sensorDataRepository.deleteAll();
    }

    /**
     * Deletes sensor data within a date-time range.
     *
     * @param start start timestamp (inclusive)
     * @param end end timestamp (inclusive)
     * @throws IllegalArgumentException if start or end is null
     */
    public void deleteSensorDataByDateRange(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) throw new IllegalArgumentException("start and end cannot be null");
        sensorDataRepository.deleteByTimestampBetween(start, end);
    }

    /**
     * Deletes all sensor data recorded by the devices of a location.
     *
     * @param locationId location identifier
     * @throws IllegalArgumentException if locationId is null
     */
    public void deleteSensorDataByLocation(Integer locationId) {
        if (locationId == null) throw new IllegalArgumentException("locationId cannot be null");
        sensorDataRepository.deleteByDeviceLocationId(locationId);
    }

    /**
     * Retrieves the earliest sensor data record.
     *
     * @return first record by timestamp
     */
    public SensorData getFirstRecord() {
        return sensorDataRepository.findFirstByOrderByTimestampAsc();
    }

    /**
     * Retrieves the most recent sensor data record.
     *
     * @return last record by timestamp
     */
    public SensorData getLastRecord() {
        return sensorDataRepository.findFirstByOrderByTimestampDesc();
    }

    public List<SensorData> searchSensorData(SensorDataSearchCriteria criteria) {
        Specification<SensorData> spec = SensorDataSpecification.buildSpecification(criteria);

        // Check if pagination parameters are provided
        if (criteria.getPage() != null && criteria.getSize() != null) {
            // Create Pageable with descending order by timestamp
            Pageable pageable = PageRequest.of(
                criteria.getPage(),
                criteria.getSize(),
                Sort.by(Sort.Direction.DESC, "timestamp")
            );
            Page<SensorData> page = sensorDataRepository.findAll(spec, pageable);
            return page.getContent();
        }

        // If no pagination, return all results
        return sensorDataRepository.findAll(spec);
    }
}
