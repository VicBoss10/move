package com.jade.move.dto;

import com.jade.move.model.DeviceState;
import com.jade.move.model.DeviceType;
import com.jade.move.model.StreamType;
import lombok.Data;

/**
 * Device registration request DTO.
 *
 * <p>Contains Device base fields and optional fields for Camera and Sensor subtypes.
 * WiFi credentials are transactional and not persisted.</p>
 */
@Data
public class RegisterDeviceRequest {
    private String name;
    private DeviceType type;
    private DeviceState state;
    private Integer locationId;
    private StreamType streamType;
    private String source;
    private String macAddress;
    private String firmwareVersion;
    private String wifiSsid;
    private String wifiPassword;
}
