package com.jade.move.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.jade.move.exception.EntityNotFoundException;
import com.jade.move.model.Sensor;
import com.jade.move.repository.SensorRepository;

@Service
public class SensorService {

    private final SensorRepository sensorRepository;
    private final SensorDataService sensorDataService;

    public SensorService(SensorRepository sensorRepository, SensorDataService sensorDataService) {
        this.sensorRepository = sensorRepository;
        this.sensorDataService = sensorDataService;
    }

    public List<Sensor> getAllSensors() {
        return sensorRepository.findAll();
    }

    public Sensor getSensorById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Sensor id cannot be null");
        }
        return sensorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sensor not found with id: " + id));
    }

    public Sensor getSensorByDeviceId(Integer deviceId) {
        if (deviceId == null) {
            throw new IllegalArgumentException("Device id cannot be null");
        }
        return sensorRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new EntityNotFoundException("Sensor not found for device id: " + deviceId));
    }

    public Sensor createSensor(Sensor sensor) {
        if (sensor == null) {
            throw new IllegalArgumentException("Sensor cannot be null");
        }
        return sensorRepository.save(sensor);
    }

    public Sensor updateSensor(Sensor sensor) {
        if (sensor == null) {
            throw new IllegalArgumentException("Sensor cannot be null");
        }
        return sensorRepository.save(sensor);
    }

    public void deleteSensor(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Sensor id cannot be null");
        }
        // before deleting sensor entity, remove sensor_data associated to its device
        try {
            Sensor s = getSensorById(id);
            if (s != null && s.getDevice() != null && s.getDevice().getId() != null) {
                sensorDataService.deleteSensorDataByDeviceId(s.getDevice().getId());
            }
        } catch (Exception ignored) {
            // if fetching sensor or deleting data fails, proceed to delete sensor record
        }

        sensorRepository.deleteById(id);
    }
}
