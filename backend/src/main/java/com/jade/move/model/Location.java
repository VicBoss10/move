package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Geographic location entity.
 *
 * <p>Represents a geographic location specified by latitude, longitude,
 * and an optional textual description.</p>
 *
 * @since 0.0.1
 */
@Entity
@Table(name = "locations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Location {

    /** Unique identifier. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Latitude coordinate. */
    @Column(nullable = false)
    private Double latitude;

    /** Longitude coordinate. */
    @Column(nullable = false)
    private Double longitude;

    /** Optional location description. */
    @Column(length = 255, unique = true)
    private String description;
}
