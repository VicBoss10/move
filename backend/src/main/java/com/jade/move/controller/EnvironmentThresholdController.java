package com.jade.move.controller;

import com.jade.move.dto.EnvironmentThresholdDto;
import com.jade.move.service.EnvironmentThresholdService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for managing environment thresholds.
 *
 * <p>Provides endpoints to create, retrieve, update, and delete customizable
 * thresholds for environmental metrics (CO₂, PM2.5, temperature, etc.).
 * Modification operations require ADMIN role authorization.</p>
 */
@RestController
@RequestMapping("/thresholds")
@RequiredArgsConstructor
@Tag(name = "Thresholds", description = "Manage environment thresholds")
public class EnvironmentThresholdController {

    private final EnvironmentThresholdService thresholdService;

    /**
     * Retrieves all registered thresholds.
     *
     * @return list of all available thresholds
     */
    @GetMapping
    @Operation(summary = "Get all thresholds")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Thresholds retrieved successfully"),
    })
    public ResponseEntity<List<EnvironmentThresholdDto>> getAllThresholds() {
        return ResponseEntity.ok(thresholdService.getAllThresholds());
    }

    /**
     * Retrieves all thresholds grouped by metric.
     *
     * @return map with metrics as keys and threshold lists as values
     */
    @GetMapping("/grouped")
    @Operation(summary = "Get thresholds grouped by metric")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Grouped thresholds retrieved successfully"),
    })
    public ResponseEntity<Map<String, List<EnvironmentThresholdDto>>> getThresholdsGrouped() {
        return ResponseEntity.ok(thresholdService.getThresholdsGroupedByMetric());
    }

    /**
     * Retrieves thresholds for a specific metric.
     *
     * @param metric environmental metric name (co2, pm25, temperature, etc.)
     * @return list of thresholds for that metric
     */
    @GetMapping("/metric/{metric}")
    @Operation(summary = "Get thresholds for specific metric")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Thresholds retrieved successfully"),
    })
    public ResponseEntity<List<EnvironmentThresholdDto>> getThresholdsByMetric(@PathVariable String metric) {
        return ResponseEntity.ok(thresholdService.getThresholdsForMetric(metric));
    }

    /**
     * Creates a new threshold.
     *
     * <p>Requires ADMIN role authorization.</p>
     *
     * @param dto threshold data to create
     * @return created threshold with assigned ID
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new threshold")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Threshold created successfully"),
        @ApiResponse(responseCode = "403", description = "Unauthorized"),
    })
    public ResponseEntity<EnvironmentThresholdDto> createThreshold(@RequestBody EnvironmentThresholdDto dto) {
        EnvironmentThresholdDto created = thresholdService.createThreshold(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Updates an existing threshold.
     *
     * <p>Requires ADMIN role authorization.</p>
     *
     * @param id threshold ID to update
     * @param dto new threshold data
     * @return updated threshold
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a threshold")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Threshold updated successfully"),
        @ApiResponse(responseCode = "403", description = "Unauthorized"),
        @ApiResponse(responseCode = "404", description = "Threshold not found"),
    })
    public ResponseEntity<EnvironmentThresholdDto> updateThreshold(@PathVariable Integer id, @RequestBody EnvironmentThresholdDto dto) {
        EnvironmentThresholdDto updated = thresholdService.updateThreshold(id, dto);
        return ResponseEntity.ok(updated);
    }

    /**
     * Deletes a specific threshold.
     *
     * <p>Requires ADMIN role authorization.</p>
     *
     * @param id threshold ID to delete
     * @return no content response (204 No Content)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a threshold")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Threshold deleted successfully"),
        @ApiResponse(responseCode = "403", description = "Unauthorized"),
    })
    public ResponseEntity<Void> deleteThreshold(@PathVariable Integer id) {
        thresholdService.deleteThreshold(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Updates all thresholds for a specific metric in a single operation.
     *
     * <p>Requires ADMIN role authorization.</p>
     *
     * @param metric metric name to update
     * @param thresholds list of new thresholds for that metric
     * @return updated threshold list for that metric
     */
    @PutMapping("/metric/{metric}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update all thresholds for a metric")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Thresholds updated successfully"),
        @ApiResponse(responseCode = "403", description = "Unauthorized"),
    })
    public ResponseEntity<List<EnvironmentThresholdDto>> updateMetricThresholds(
        @PathVariable String metric,
        @RequestBody List<EnvironmentThresholdDto> thresholds
    ) {
        thresholdService.updateMetricThresholds(metric, thresholds);
        return ResponseEntity.ok(thresholdService.getThresholdsForMetric(metric));
    }

    /**
     * Deletes all thresholds associated with a specific metric.
     *
     * <p>Requires ADMIN role authorization.</p>
     *
     * @param metric metric name whose thresholds will be deleted
     * @return no content response (204 No Content)
     */
    @DeleteMapping("/metric/{metric}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete all thresholds for a metric")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Thresholds deleted successfully"),
        @ApiResponse(responseCode = "403", description = "Unauthorized"),
    })
    public ResponseEntity<Void> deleteMetricThresholds(@PathVariable String metric) {
        thresholdService.deleteThresholdsForMetric(metric);
        return ResponseEntity.noContent().build();
    }
}
