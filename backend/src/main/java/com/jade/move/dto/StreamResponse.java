package com.jade.move.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StreamResponse {
    
    private String sessionId;
    private String streamUrl;
    private String status;
    private String streamType;
    private Integer detectionCount;
}
