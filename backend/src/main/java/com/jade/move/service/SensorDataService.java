package com.jade.move.service;

import com.jade.move.model.SensorData;
import com.jade.move.repository.SensorDataRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class SensorDataService {

    private final SensorDataRepository sensorDataRepository;

    public SensorDataService(SensorDataRepository sensorDataRepository) {
        this.sensorDataRepository = sensorDataRepository;
    }

    public List<SensorData> getAllSensorData() {
        return sensorDataRepository.findAll();
    }

    public Optional<SensorData> getSensorDataById(Integer id) {
        return sensorDataRepository.findById(id);
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
        return sensorDataRepository.save(sensorData);
    }

    public SensorData updateSensorData(SensorData sensorData) {
        return sensorDataRepository.save(sensorData);
    }

    public void deleteSensorData(Integer id) {
        sensorDataRepository.deleteById(id);
    }
}