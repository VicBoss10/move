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
 * Servicio para la gestión de umbrales ambientales.
 *
 * <p>Proporciona operaciones CRUD y lógica de negocio para los umbrales personalizables
 * de métricas ambientales. Maneja la conversión entre entidades y DTOs, y coordina
 * las operaciones de persistencia a través del repositorio.</p>
 *
 * @since 0.0.1
 */
@Service
@RequiredArgsConstructor
public class EnvironmentThresholdService {

    private final EnvironmentThresholdRepository thresholdRepository;

    /**
     * Obtiene todos los umbrales registrados en el sistema.
     *
     * @return lista de todos los umbrales como DTOs
     */
    @Transactional(readOnly = true)
    public List<EnvironmentThresholdDto> getAllThresholds() {
        return thresholdRepository.findAll()
            .stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Obtiene los umbrales para una métrica específica.
     *
     * @param metric nombre de la métrica ambiental
     * @return lista de umbrales para esa métrica
     */
    @Transactional(readOnly = true)
    public List<EnvironmentThresholdDto> getThresholdsForMetric(String metric) {
        return thresholdRepository.findByMetricOrderByLevel(metric)
            .stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Obtiene todos los umbrales agrupados por métrica.
     *
     * @return mapa con métricas como claves y listas de umbrales como valores
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
     * Crea un nuevo umbral en el sistema.
     *
     * @param dto datos del umbral a crear
     * @return DTO del umbral creado con su identificador asignado
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
     * Actualiza un umbral existente.
     *
     * @param id identificador del umbral a actualizar
     * @param dto nuevos datos del umbral
     * @return DTO del umbral actualizado
     * @throws RuntimeException si el umbral no existe
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
     * Elimina un umbral específico por su identificador.
     *
     * @param id identificador del umbral a eliminar
     */
    @Transactional
    public void deleteThreshold(Integer id) {
        thresholdRepository.deleteById(id);
    }

    /**
     * Elimina todos los umbrales asociados a una métrica específica.
     *
     * @param metric nombre de la métrica cuyos umbrales serán eliminados
     */
    @Transactional
    public void deleteThresholdsForMetric(String metric) {
        thresholdRepository.deleteByMetric(metric);
    }

    /**
     * Actualiza todos los umbrales de una métrica en una sola operación.
     *
     * <p>Elimina todos los umbrales existentes para la métrica y crea nuevos registros
     * con los valores proporcionados. El nivel crítico se calcula automáticamente y no se persiste.</p>
     *
     * @param metric nombre de la métrica a actualizar
     * @param thresholds lista de nuevos umbrales para esa métrica (excluyendo crítico)
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
     * Convierte una entidad EnvironmentThreshold a su DTO correspondiente.
     *
     * @param entity la entidad a convertir
     * @return DTO con los datos de la entidad
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
