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

@Service
public class SensorDataService {

    private final SensorDataRepository sensorDataRepository;

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
        return sensorDataRepository.save(sensorData);
    }

    public SensorData updateSensorData(SensorData sensorData) {
        if (sensorData == null) {
            throw new IllegalArgumentException("SensorData cannot be null");
        }
        return sensorDataRepository.save(sensorData);
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