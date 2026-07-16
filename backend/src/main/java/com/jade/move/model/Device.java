package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Device entity representing physical IoT devices.
 *
 * <p>Represents a physical device (camera or sensor) located at a specific
 * geographic location. Manages device state and type information.</p>
 *
 * @since 0.0.1
 */
@Entity
@Table(name="devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Device {

    /** Unique identifier. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Unique device name. */
    @Column(nullable = false, length = 100, unique = true)
    private String name;

    /** Device type (CAMERA or SENSOR). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeviceType type;

    /** Current device state (ACTIVE, INACTIVE, FAILING, PROVISIONAL). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeviceState state;

    /** Associated location entity. */
    @ManyToOne
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    /**
     * Whether the device has been archived ("moved").
     *
     * <p>An archived device keeps its historical data and location, but is no
     * longer operational: the state scheduler ignores it, incoming sensor data
     * is rejected, and the physical unit is signaled to return to provisioning
     * mode. Defaults to {@code false}.</p>
     */
    @Column(nullable = false)
    private Boolean archived = false;
}
