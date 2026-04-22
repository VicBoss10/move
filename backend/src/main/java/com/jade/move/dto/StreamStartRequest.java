package com.jade.move.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StreamStartRequest {

    @NotNull(message = "Camera ID is required")
    private Integer cameraId;
}
