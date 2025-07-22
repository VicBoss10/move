package com.jade.move.dto;

import com.jade.move.model.DeviceState;
import com.jade.move.model.DeviceType;
import lombok.Data;

@Data
public class DevicesSearchCriteria {
    private DeviceType type;
    private DeviceState state;
    private Integer locationId;
}
