package com.jade.move.scheduler;

import com.jade.move.model.Device;
import com.jade.move.model.DeviceState;
import com.jade.move.model.DeviceType;
import com.jade.move.model.SensorData;
import com.jade.move.model.VehicleDetected;
import com.jade.move.repository.DeviceRepository;
import com.jade.move.repository.SensorDataRepository;
import com.jade.move.repository.VehicleDetectedRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Scheduled job that marks devices as INACTIVE when no data has been received
 * within the configured thresholds, using Colombia time (America/Bogota)
 * for comparisons (same timezone that data timestamps are stored in).
 * 
 * Evaluates:
 * - SENSOR devices: uses SensorData, default 10 min threshold
 * - CAMERA devices: uses VehicleDetected, default 60 min threshold
 */
@Component
public class DeviceStateScheduler {

    private static final Logger log = LoggerFactory.getLogger(DeviceStateScheduler.class);
    private static final ZoneId COLOMBIA_ZONE = ZoneId.of("America/Bogota");

    private final DeviceRepository deviceRepository;
    private final SensorDataRepository sensorDataRepository;
    private final VehicleDetectedRepository vehicleDetectedRepository;

    @Value("${device.state.inactive-minutes:10}")
    private int sensorInactiveThresholdMinutes;

    @Value("${device.state.camera-inactive-minutes:60}")
    private int cameraInactiveThresholdMinutes;

    public DeviceStateScheduler(DeviceRepository deviceRepository,
                                SensorDataRepository sensorDataRepository,
                                VehicleDetectedRepository vehicleDetectedRepository) {
        this.deviceRepository = deviceRepository;
        this.sensorDataRepository = sensorDataRepository;
        this.vehicleDetectedRepository = vehicleDetectedRepository;
    }

    /**
     * Master scheduler that evaluates both SENSOR and CAMERA device states.
     * Runs every minute.
     */
    @Scheduled(fixedDelayString = "${device.state.check-interval-ms:60000}")
    @Transactional
    public void evaluateAllDeviceStates() {
        evaluateSensorDeviceStates();
        evaluateCameraDeviceStates();
    }

    /**
     * Evaluates SENSOR devices based on sensor data activity.
     * Called by master scheduler or can be called independently.
     * 
     * IMPORTANTE: Solo marca como INACTIVE si no hay datos recientes.
     * La transición INACTIVE -> ACTIVE ocurre SOLO cuando llega un dato nuevo (en SensorDataService).
     */
    @Transactional
    public void evaluateSensorDeviceStates() {
        LocalDateTime inactiveThreshold = LocalDateTime.now(COLOMBIA_ZONE)
                .minusMinutes(sensorInactiveThresholdMinutes);

        List<Device> sensorDevices = deviceRepository.findByType(DeviceType.SENSOR);

        for (Device device : sensorDevices) {
            if (device.getState() == DeviceState.PROVISIONAL) {
                // Provisional devices transition to ACTIVE reactively on first valid data
                continue;
            }

            SensorData latest = sensorDataRepository
                    .findTopByDeviceIdOrderByTimestampDesc(device.getId());

            boolean hasRecentData = latest != null
                    && latest.getTimestamp().isAfter(inactiveThreshold);

            // Solo marcar como INACTIVE si no hay datos recientes
            if (!hasRecentData && device.getState() != DeviceState.INACTIVE) {
                device.setState(DeviceState.INACTIVE);
                deviceRepository.save(device);
                log.info("Device {} ({}) marked INACTIVE — no sensor data since threshold ({}m)",
                        device.getId(), device.getName(), sensorInactiveThresholdMinutes);
            }
            
            // NO pasar de INACTIVE a ACTIVE aquí. Eso ocurre en SensorDataService cuando llega un dato nuevo.
            // Esto evita que sensores INACTIVE se activen solo porque hay datos antiguos.
        }
    }

    /**
     * Evaluates CAMERA devices based on vehicle detection activity.
     * Runs same schedule as sensor evaluation.
     * 
     * IMPORTANTE: Solo marca como INACTIVE si no hay datos recientes.
     * La transición INACTIVE -> ACTIVE ocurre SOLO cuando llega un dato nuevo (en VehicleDetectedService).
     */
    @Transactional
    public void evaluateCameraDeviceStates() {
        LocalDateTime inactiveThreshold = LocalDateTime.now(COLOMBIA_ZONE)
                .minusMinutes(cameraInactiveThresholdMinutes);

        List<Device> cameraDevices = deviceRepository.findByType(DeviceType.CAMERA);

        for (Device device : cameraDevices) {
            if (device.getState() == DeviceState.PROVISIONAL) {
                // Provisional devices transition to ACTIVE reactively on first detection
                continue;
            }

            VehicleDetected latest = vehicleDetectedRepository
                    .findTopByDeviceIdOrderByTimestampDesc(device.getId());

            boolean hasRecentDetection = latest != null
                    && latest.getTimestamp().isAfter(inactiveThreshold);

            // Solo marcar como INACTIVE si no hay datos recientes
            if (!hasRecentDetection && device.getState() != DeviceState.INACTIVE) {
                device.setState(DeviceState.INACTIVE);
                deviceRepository.save(device);
                log.info("Device {} ({}) marked INACTIVE — no vehicle detections since threshold ({}m)",
                        device.getId(), device.getName(), cameraInactiveThresholdMinutes);
            }
            
            // NO pasar de INACTIVE a ACTIVE aquí. Eso ocurre en VehicleDetectedService cuando llega un dato nuevo.
            // Esto evita que cámaras INACTIVE se activen solo porque hay datos antiguos.
        }
    }
}
