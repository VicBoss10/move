package com.jade.move.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.jade.move.exception.EntityNotFoundException;
import com.jade.move.model.Sensor;
import com.jade.move.repository.SensorRepository;

/**
 * Service for sensor management.
 *
 * <p>Provides business logic for sensors including retrieval, creation,
 * updates, and deletion. When a sensor is deleted, associated sensor
 * data is automatically cleaned up.</p>
 *
 * @since 0.0.1
 */
@Service
public class SensorService {

    private final SensorRepository sensorRepository;
    private final SensorDataService sensorDataService;

    public SensorService(SensorRepository sensorRepository, SensorDataService sensorDataService) {
        this.sensorRepository = sensorRepository;
        this.sensorDataService = sensorDataService;
    }

    /**
     * Retrieves all sensors.
     *
     * @return list of all sensors
     */
    public List<Sensor> getAllSensors() {
        return sensorRepository.findAll();
    }

    /**
     * Retrieves a sensor by identifier.
     *
     * @param id sensor identifier
     * @return sensor data
     * @throws IllegalArgumentException if id is null
     * @throws EntityNotFoundException if sensor not found
     */
    public Sensor getSensorById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Sensor id cannot be null");
        }
        return sensorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Sensor not found with id: " + id));
    }

    /**
     * Retrieves the sensor associated with a device.
     *
     * @param deviceId device identifier
     * @return sensor for the device
     * @throws IllegalArgumentException if deviceId is null
     * @throws EntityNotFoundException if no sensor found
     */
    public Sensor getSensorByDeviceId(Integer deviceId) {
        if (deviceId == null) {
            throw new IllegalArgumentException("Device id cannot be null");
        }
        return sensorRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new EntityNotFoundException("Sensor not found for device id: " + deviceId));
    }

    /**
     * Creates a new sensor.
     *
     * @param sensor sensor to persist
     * @return created sensor
     * @throws IllegalArgumentException if sensor is null
     */
    public Sensor createSensor(Sensor sensor) {
        if (sensor == null) {
            throw new IllegalArgumentException("Sensor cannot be null");
        }
        return sensorRepository.save(sensor);
    }

    /**
     * Updates an existing sensor.
     *
     * @param sensor sensor with updated data
     * @return updated sensor
     * @throws IllegalArgumentException if sensor is null
     */
    public Sensor updateSensor(Sensor sensor) {
        if (sensor == null) {
            throw new IllegalArgumentException("Sensor cannot be null");
        }
        return sensorRepository.save(sensor);
    }

    /**
     * Deletes a sensor by identifier.
     *
     * <p>Before deletion, associated sensor data is automatically removed
     * to maintain referential integrity.</p>
     *
     * @param id sensor identifier to delete
     * @throws IllegalArgumentException if id is null
     */
    public void deleteSensor(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Sensor id cannot be null");
        }
        try {
            Sensor s = getSensorById(id);
            if (s != null && s.getDevice() != null && s.getDevice().getId() != null) {
                sensorDataService.deleteSensorDataByDeviceId(s.getDevice().getId());
            }
        } catch (Exception ignored) {
        }

        sensorRepository.deleteById(id);
    }
}
