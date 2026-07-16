package com.jade.move.scheduler;

import com.jade.move.model.Device;
import com.jade.move.model.DeviceState;
import com.jade.move.model.DeviceType;
import com.jade.move.model.SensorData;
import com.jade.move.repository.DeviceRepository;
import com.jade.move.repository.SensorDataRepository;
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
 * Scheduled job that marks SENSOR devices as INACTIVE when no data has been received
 * within the configured threshold, using Colombia time (America/Bogota)
 * for comparisons (same timezone that data timestamps are stored in).
 *
 * Evaluates:
 * - SENSOR devices: uses SensorData, default 10 min threshold
 * - CAMERA devices: transitions to ACTIVE are handled only when new detection data arrives
 */
@Component
public class DeviceStateScheduler {

    private static final Logger log = LoggerFactory.getLogger(DeviceStateScheduler.class);
    private static final ZoneId COLOMBIA_ZONE = ZoneId.of("America/Bogota");

    private final DeviceRepository deviceRepository;
    private final SensorDataRepository sensorDataRepository;

    @Value("${device.state.inactive-minutes:10}")
    private int sensorInactiveThresholdMinutes;

    public DeviceStateScheduler(DeviceRepository deviceRepository,
                                SensorDataRepository sensorDataRepository) {
        this.deviceRepository = deviceRepository;
        this.sensorDataRepository = sensorDataRepository;
    }

    /**
     * Master scheduler that evaluates SENSOR device states.
     * Runs every minute.
     */
    @Scheduled(fixedDelayString = "${device.state.check-interval-ms:60000}")
    @Transactional
    public void evaluateAllDeviceStates() {
        evaluateSensorDeviceStates();
    }

    /**
     * Evaluates SENSOR devices based on sensor data activity.
     * Only marks devices as INACTIVE when no data has been received within the threshold.
     * Transition from INACTIVE to ACTIVE happens only when new sensor data arrives.
     */
    @Transactional
    public void evaluateSensorDeviceStates() {
        LocalDateTime inactiveThreshold = LocalDateTime.now(COLOMBIA_ZONE)
                .minusMinutes(sensorInactiveThresholdMinutes);

        List<Device> sensorDevices = deviceRepository.findByType(DeviceType.SENSOR);

        for (Device device : sensorDevices) {
            if (device.getState() == DeviceState.PROVISIONAL) {
                continue;
            }

            if (Boolean.TRUE.equals(device.getArchived())) {
                continue;
            }

            SensorData latest = sensorDataRepository
                    .findTopByDeviceIdOrderByTimestampDesc(device.getId());

            boolean hasRecentData = latest != null
                    && latest.getTimestamp().isAfter(inactiveThreshold);

            if (!hasRecentData && device.getState() != DeviceState.INACTIVE) {
                device.setState(DeviceState.INACTIVE);
                deviceRepository.save(device);
                log.info("Device {} ({}) marked INACTIVE — no sensor data since threshold ({}m)",
                        device.getId(), device.getName(), sensorInactiveThresholdMinutes);
            }
        }
    }
}
