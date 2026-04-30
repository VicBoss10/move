package com.jade.move.service;

import com.jade.move.dto.EnvironmentThresholdDto;
import com.jade.move.model.EnvironmentThreshold;
import com.jade.move.repository.EnvironmentThresholdRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing environment thresholds.
 *
 * <p>Provides CRUD operations and business logic for customizable environment
 * metric thresholds. Handles entity-to-DTO conversion and coordinates
 * persistence operations through the repository.</p>
 */
@Service
@RequiredArgsConstructor
public class EnvironmentThresholdService {

    private final EnvironmentThresholdRepository thresholdRepository;

    /**
     * Retrieves all registered thresholds in the system.
     *
     * @return list of all thresholds as DTOs
     */
    @Transactional(readOnly = true)
    public List<EnvironmentThresholdDto> getAllThresholds() {
        return thresholdRepository.findAll()
            .stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Retrieves thresholds for a specific metric.
     *
     * @param metric environmental metric name
     * @return list of thresholds for that metric
     */
    @Transactional(readOnly = true)
    public List<EnvironmentThresholdDto> getThresholdsForMetric(String metric) {
        return thresholdRepository.findByMetricOrderByLevel(metric)
            .stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Retrieves all thresholds grouped by metric.
     *
     * @return map with metrics as keys and threshold lists as values
     */
    @Transactional(readOnly = true)
    public Map<String, List<EnvironmentThresholdDto>> getThresholdsGroupedByMetric() {
        List<EnvironmentThreshold> allThresholds = thresholdRepository.findAll();
        return allThresholds.stream()
            .collect(Collectors.groupingBy(
                EnvironmentThreshold::getMetric,
                Collectors.mapping(this::toDto, Collectors.toList())
            ));
    }

    /**
     * Creates a new threshold in the system.
     *
     * @param dto threshold data to create
     * @return DTO of the created threshold with assigned ID
     */
    @Transactional
    public EnvironmentThresholdDto createThreshold(EnvironmentThresholdDto dto) {
        EnvironmentThreshold threshold = new EnvironmentThreshold();
        threshold.setMetric(dto.getMetric());
        threshold.setLevel(dto.getLevel());
        threshold.setMaxValue(dto.getMaxValue());

        EnvironmentThreshold saved = thresholdRepository.save(threshold);
        return toDto(saved);
    }

    /**
     * Updates an existing threshold.
     *
     * @param id threshold ID to update
     * @param dto new threshold data
     * @return DTO of the updated threshold
     * @throws RuntimeException if threshold not found
     */
    @Transactional
    public EnvironmentThresholdDto updateThreshold(Integer id, EnvironmentThresholdDto dto) {
        EnvironmentThreshold threshold = thresholdRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Threshold not found with id: " + id));

        threshold.setMaxValue(dto.getMaxValue());

        EnvironmentThreshold updated = thresholdRepository.save(threshold);
        return toDto(updated);
    }

    /**
     * Deletes a specific threshold by ID.
     *
     * @param id threshold ID to delete
     */
    @Transactional
    public void deleteThreshold(Integer id) {
        thresholdRepository.deleteById(id);
    }

    /**
     * Deletes all thresholds associated with a specific metric.
     *
     * @param metric metric name whose thresholds will be deleted
     */
    @Transactional
    public void deleteThresholdsForMetric(String metric) {
        thresholdRepository.deleteByMetric(metric);
    }

    /**
     * Updates all thresholds for a metric in a single operation.
     *
     * <p>Deletes all existing thresholds for the metric and creates new records
     * with provided values. Critical level is calculated automatically and not persisted.</p>
     *
     * @param metric metric name to update
     * @param thresholds list of new thresholds for that metric (excluding critical)
     */
    @Transactional
    public void updateMetricThresholds(String metric, List<EnvironmentThresholdDto> thresholds) {
        thresholdRepository.deleteByMetric(metric);
        for (EnvironmentThresholdDto dto : thresholds) {
            if (!"critical".equals(dto.getLevel())) {
                createThreshold(new EnvironmentThresholdDto(null, metric, dto.getLevel(), dto.getMaxValue(), null, null));
            }
        }
    }

    /**
     * Converts an EnvironmentThreshold entity to its DTO.
     *
     * @param entity entity to convert
     * @return DTO with entity data
     */
    private EnvironmentThresholdDto toDto(EnvironmentThreshold entity) {
        return new EnvironmentThresholdDto(
            entity.getId(),
            entity.getMetric(),
            entity.getLevel(),
            entity.getMaxValue(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
