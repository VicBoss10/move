package com.jade.move.dto;

import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Data
public class SensorDataSearchCriteria {
    private Double minTemperature;
    private Double maxTemperature;
    private Double minHumidity;
    private Double maxHumidity;
    private Double minCo2;
    private Double maxCo2;
    private Double minPm25;
    private Double maxPm25;
    private Double minPm10;
    private Double maxPm10;
    private Double minCo;
    private Double maxCo;
    private Double minNo2;
    private Double maxNo2;
    private Double minNh3;
    private Double maxNh3;    
    private Integer deviceId;
    private Integer locationId;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime start;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime end;
}
