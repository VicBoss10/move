package com.jade.move.exception;

/**
 * Thrown when sensor data is received for a device that has been archived
 * ("moved"). Maps to HTTP 410 Gone: the device is no longer a valid target,
 * signaling the physical unit to return to provisioning mode.
 */
public class DeviceArchivedException extends RuntimeException {
    public DeviceArchivedException(String message) {
        super(message);
    }
}
