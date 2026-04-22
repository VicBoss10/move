package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Sensor entity for environmental data collection.
 *
 * <p>Represents a sensor device that collects environmental data.
 * Associated with a device on a one-to-one relationship and tracks
 * firmware version and Keycloak provisioning information.</p>
 *
 * @since 0.0.1
 */
@Entity
@Table(name = "sensors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Sensor {

    /** Unique identifier. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Associated device entity. */
    @OneToOne
    @JoinColumn(name = "device_id", nullable = false, unique = true)
    private Device device;

    /** Unique MAC address of the sensor. */
    @Column(nullable = false, length = 17, unique = true)
    private String macAddress;

    /** Firmware version running on the sensor. */
    @Column(nullable = false, length = 50)
    private String firmwareVersion;

    /** Registration timestamp. */
    @Column(nullable = false)
    private LocalDateTime registeredAt;

    /** Keycloak internal client ID for revocation on provisioning failure. */
    @Column(name = "keycloak_internal_id", length = 128)
    private String keycloakInternalId;
}
