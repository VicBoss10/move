package com.jade.move.dto;

import lombok.Data;

@Data
public class LocationSearchCriteria {
    private String description;
    private String keyword;
    private Double latitude;
    private Double longitude;
    private Double radiusKm;
}
