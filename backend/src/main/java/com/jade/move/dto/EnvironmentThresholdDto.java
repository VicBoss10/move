package com.jade.move.dto;

import lombok.*;
import java.time.LocalDateTime;

/**
 * DTO (Data Transfer Object) para transferencia de datos de umbrales ambientales.
 *
 * <p>Transporta información sobre umbrales de métricas ambientales entre el cliente
 * y el servidor. Incluye todos los campos necesarios para crear, actualizar y
 * consultar umbrales personalizados.</p>
 *
 * @since 0.0.1
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnvironmentThresholdDto {
    /** Identificador único del umbral. */
    private Integer id;

    /** Nombre de la métrica ambiental (co2, pm25, temperatura, etc.). */
    private String metric;

    /** Nivel del umbral (good, moderate, poor, critical). */
    private String level;

    /** Valor máximo del umbral. Nulo para el nivel crítico. */
    private Double maxValue;

    /** Marca de tiempo de creación del registro. */
    private LocalDateTime createdAt;

    /** Marca de tiempo de la última actualización del registro. */
    private LocalDateTime updatedAt;
}
