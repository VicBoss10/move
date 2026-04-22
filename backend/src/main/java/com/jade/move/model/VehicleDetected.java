package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Vehicle detection record entity.
 *
 * <p>Represents a vehicle detection event recorded with timestamp,
 * vehicle type, and associated device.</p>
 *
 * @since 0.0.1
 */
@Entity
@Table(name = "vehicles_detected")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VehicleDetected {

    /** Unique identifier. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Type of detected vehicle (CAR, BUS, MOTORCYCLE, BICYCLE, TRUCK). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType vehicleType;

    /** Detection timestamp. */
    @Column(nullable = false)
    private LocalDateTime timestamp;

    /** Associated camera device entity. */
    @ManyToOne
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;
}
