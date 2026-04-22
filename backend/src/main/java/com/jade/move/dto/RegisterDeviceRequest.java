package com.jade.move.dto;

import com.jade.move.model.DeviceState;
import com.jade.move.model.DeviceType;
import com.jade.move.model.StreamType;
import lombok.Data;

/**
 * DTO para registro de dispositivos (Cámaras y Sensores)
 * Contiene campos base del Device y campos opcionales para Camera
 */
@Data
public class RegisterDeviceRequest {
    // Campos de Device (requeridos)
    private String name;
    private DeviceType type;
    private DeviceState state;
    private Integer locationId;

    // Campos de Camera (opcionales, solo para type=CAMERA)
    private StreamType streamType;
    private String source;

    // Campos de Sensor (opcionales, solo para type=SENSOR)
    private String macAddress;
    private String firmwareVersion;

    // WiFi credentials (transaccional - no se persisten)
    private String wifiSsid;
    private String wifiPassword;
}
