package com.jade.move.dto;

import lombok.*;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for environment threshold data exchange.
 *
 * <p>Carries environment metric threshold information between client and server.
 * Includes all fields needed to create, update, and retrieve custom thresholds.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnvironmentThresholdDto {
    private Integer id;
    private String metric;
    private String level;
    private Double maxValue;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
