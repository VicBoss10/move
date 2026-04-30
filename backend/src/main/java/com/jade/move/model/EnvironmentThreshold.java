package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entity representing customizable thresholds for environmental metrics.
 *
 * <p>Stores user-configured thresholds for environmental metrics such as CO₂, PM2.5,
 * temperature, etc. Each threshold level (good, moderate, poor, critical) has an
 * associated maximum value defining the upper limit of that level.</p>
 *
 * <p>Creation and modification timestamps are automatically tracked.</p>
 */
@Entity
@Table(name = "environment_thresholds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EnvironmentThreshold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 50)
    private String metric;

    @Column(nullable = false, length = 50)
    private String level;

    @Column(nullable = true)
    private Double maxValue;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
