package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entidad que representa umbrales personalizables para métricas ambientales.
 *
 * <p>Almacena los umbrales configurados por el usuario para métricas ambientales
 * como CO₂, PM2.5, temperatura, etc. Cada nivel de umbral (bueno, moderado, pobre, crítico)
 * tiene un valor máximo asociado que define el límite superior de ese nivel.</p>
 *
 * <p>Los cambios son rastreados automáticamente mediante timestamps de creación y actualización.</p>
 *
 * @since 0.0.1
 */
@Entity
@Table(name = "environment_thresholds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EnvironmentThreshold {

    /** Identificador único del umbral. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Nombre de la métrica ambiental (co2, pm25, temperatura, etc.). */
    @Column(nullable = false, length = 50)
    private String metric;

    /** Nivel del umbral (good, moderate, poor, critical). */
    @Column(nullable = false, length = 50)
    private String level;

    /** Valor máximo del umbral. Nulo para el nivel crítico (sin límite superior). */
    @Column(nullable = true)
    private Double maxValue;

    /** Marca de tiempo de creación del registro (no editable). */
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Marca de tiempo de la última actualización del registro. */
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Callback ejecutado antes de persistir la entidad.
     * Establece los timestamps de creación y actualización.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    /**
     * Callback ejecutado antes de actualizar la entidad.
     * Actualiza el timestamp de modificación.
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
