package com.jade.move.model;

/**
 * Device state enumeration.
 *
 * <p>Represents the operational state of a device:</p>
 * <ul>
 *   <li>ACTIVE: Device is operational and receiving data</li>
 *   <li>INACTIVE: Device exists but is not currently active</li>
 *   <li>FAILING: Device is detecting failures (e.g., sensor errors)</li>
 *   <li>PROVISIONAL: Device is in provisioning phase</li>
 * </ul>
 *
 * @since 0.0.1
 */
public enum DeviceState {
    ACTIVE,
    INACTIVE,
    FAILING,
    PROVISIONAL
}
