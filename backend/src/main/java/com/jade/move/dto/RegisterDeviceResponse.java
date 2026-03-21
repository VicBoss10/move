package com.jade.move.dto;

public class RegisterDeviceResponse {
    private Integer deviceId;
    private String message;
    private KeycloakClientInfo keycloakClientInfo; // null unless device is SENSOR

    public RegisterDeviceResponse() {}

    public RegisterDeviceResponse(Integer deviceId, String message) {
        this.deviceId = deviceId;
        this.message = message;
    }

    public Integer getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(Integer deviceId) {
        this.deviceId = deviceId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public KeycloakClientInfo getKeycloakClientInfo() {
        return keycloakClientInfo;
    }

    public void setKeycloakClientInfo(KeycloakClientInfo keycloakClientInfo) {
        this.keycloakClientInfo = keycloakClientInfo;
    }
}
