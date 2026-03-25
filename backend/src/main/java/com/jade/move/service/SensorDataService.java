package com.jade.move.service;

import com.jade.move.dto.SensorDataSearchCriteria;
import com.jade.move.model.SensorData;
import com.jade.move.repository.SensorDataRepository;
import com.jade.move.specification.SensorDataSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.jade.move.exception.EntityNotFoundException;
import com.jade.move.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SensorDataService {

    private final SensorDataRepository sensorDataRepository;
    private final Logger log = LoggerFactory.getLogger(SensorDataService.class);

    // tracks consecutive rejected sensor posts per deviceId
    private final Map<Integer, Integer> consecutiveRejectedByDevice = new ConcurrentHashMap<>();

    public SensorDataService(SensorDataRepository sensorDataRepository) {
        this.sensorDataRepository = sensorDataRepository;
    }

    public List<SensorData> getAllSensorData() {
        return sensorDataRepository.findAll();
    }

    public SensorData getSensorDataById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("SensorData id cannot be null");
        }
        return sensorDataRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sensor data not found with id: " + id));
    }

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

    public SensorData createSensorData(SensorData sensorData) {
        if (sensorData == null) {
            throw new IllegalArgumentException("SensorData cannot be null");
        }
        Integer deviceId = sensorData.getDevice() != null ? sensorData.getDevice().getId() : null;
        if (containsInvalidSentinel(sensorData)) {
            int count = incrementRejectedCount(deviceId);
            log.warn("Rejected sensor data for device {}. consecutive rejects={}", deviceId, count);
            if (count >= 3) {
                log.error("Device {} has {} consecutive rejected sensor data entries — possible sensor failure", deviceId, count);
                // TODO: add alerting / mark device degraded
            }
            throw new BadRequestException("Sensor data contains invalid sentinel value -1 and will not be accepted");
        }
        // accepted -> reset consecutive rejected counter
        resetRejectedCount(deviceId);
        return sensorDataRepository.save(sensorData);
    }

    public SensorData updateSensorData(SensorData sensorData) {
        if (sensorData == null) {
            throw new IllegalArgumentException("SensorData cannot be null");
        }
        Integer deviceId = sensorData.getDevice() != null ? sensorData.getDevice().getId() : null;
        if (containsInvalidSentinel(sensorData)) {
            int count = incrementRejectedCount(deviceId);
            log.warn("Rejected sensor data update for device {}. consecutive rejects={}", deviceId, count);
            if (count >= 3) {
                log.error("Device {} has {} consecutive rejected sensor data updates — possible sensor failure", deviceId, count);
                // TODO: add alerting / mark device degraded
            }
            throw new BadRequestException("Sensor data contains invalid sentinel value -1 and will not be accepted");
        }
        resetRejectedCount(deviceId);
        return sensorDataRepository.save(sensorData);
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

    public void deleteSensorData(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Id cannot be null");
        }
        sensorDataRepository.deleteById(id);
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