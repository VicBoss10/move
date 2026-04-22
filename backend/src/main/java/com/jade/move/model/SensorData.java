package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Sensor data entity for environmental measurements.
 *
 * <p>Represents a single measurement record from a sensor containing
 * temperature, humidity, CO2, PM2.5, PM10, CO, NO2, and NH3 values.
 * Includes timestamp and device reference.</p>
 *
 * @since 0.0.1
 */
@Entity
@Table(name = "sensor_data")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SensorData {

    /** Unique identifier. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Temperature measurement in Celsius. */
    @Column(nullable = false)
    private Double temperature;

    /** Humidity measurement as percentage. */
    @Column(nullable = false)
    private Double humidity;

    /** Carbon dioxide concentration in ppm. */
    @Column(nullable = false)
    private Double co2;

    /** PM2.5 particulate concentration in µg/m³. */
    @Column(nullable = false)
    private Double pm25;

    /** PM10 particulate concentration in µg/m³. */
    @Column(nullable = false)
    private Double pm10;

    /** Carbon monoxide concentration in ppm. */
    @Column(nullable = false)
    private Double co;

    /** Nitrogen dioxide concentration in ppm. */
    @Column(nullable = false)
    private Double no2;

    /** Ammonia concentration in ppm. */
    @Column(nullable = false)
    private Double nh3;

    /** Measurement timestamp. */
    @Column(nullable = false)
    private LocalDateTime timestamp;

    /** Associated device entity. */
    @ManyToOne
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;
}
