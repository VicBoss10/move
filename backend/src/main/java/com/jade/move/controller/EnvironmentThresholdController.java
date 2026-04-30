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
 * Controlador REST para la gestión de umbrales ambientales.
 *
 * <p>Proporciona endpoints para crear, obtener, actualizar y eliminar umbrales personalizables
 * de métricas ambientales (CO₂, PM2.5, temperatura, etc.). Las operaciones de modificación
 * requieren autorización de rol ADMIN.</p>
 *
 * @since 0.0.1
 */
@RestController
@RequestMapping("/thresholds")
@RequiredArgsConstructor
@Tag(name = "Umbrales", description = "Gestión de umbrales ambientales / Managing environment thresholds")
public class EnvironmentThresholdController {

    private final EnvironmentThresholdService thresholdService;

    /**
     * Obtiene todos los umbrales registrados en el sistema.
     *
     * @return lista de todos los umbrales disponibles
     */
    @GetMapping
    @Operation(summary = "Obtener todos los umbrales / Get all thresholds")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Lista de umbrales obtenida exitosamente"),
    })
    public ResponseEntity<List<EnvironmentThresholdDto>> getAllThresholds() {
        return ResponseEntity.ok(thresholdService.getAllThresholds());
    }

    /**
     * Obtiene todos los umbrales agrupados por métrica ambiental.
     *
     * @return mapa con métricas como claves y listas de umbrales como valores
     */
    @GetMapping("/grouped")
    @Operation(summary = "Obtener umbrales agrupados por métrica / Get thresholds grouped by metric")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Umbrales agrupados obtenidos exitosamente"),
    })
    public ResponseEntity<Map<String, List<EnvironmentThresholdDto>>> getThresholdsGrouped() {
        return ResponseEntity.ok(thresholdService.getThresholdsGroupedByMetric());
    }

    /**
     * Obtiene los umbrales para una métrica específica.
     *
     * @param metric nombre de la métrica ambiental (co2, pm25, temperatura, etc.)
     * @return lista de umbrales para esa métrica
     */
    @GetMapping("/metric/{metric}")
    @Operation(summary = "Obtener umbrales para una métrica específica / Get thresholds for specific metric")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Umbrales obtenidos exitosamente"),
    })
    public ResponseEntity<List<EnvironmentThresholdDto>> getThresholdsByMetric(@PathVariable String metric) {
        return ResponseEntity.ok(thresholdService.getThresholdsForMetric(metric));
    }

    /**
     * Crea un nuevo umbral en el sistema.
     *
     * <p>Requiere autorización de rol ADMIN.</p>
     *
     * @param dto datos del umbral a crear
     * @return umbral creado con su identificador asignado
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crear un nuevo umbral / Create a new threshold")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Umbral creado exitosamente"),
        @ApiResponse(responseCode = "403", description = "No autorizado"),
    })
    public ResponseEntity<EnvironmentThresholdDto> createThreshold(@RequestBody EnvironmentThresholdDto dto) {
        EnvironmentThresholdDto created = thresholdService.createThreshold(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Actualiza un umbral existente.
     *
     * <p>Requiere autorización de rol ADMIN.</p>
     *
     * @param id identificador del umbral a actualizar
     * @param dto nuevos datos del umbral
     * @return umbral actualizado
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualizar un umbral / Update a threshold")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Umbral actualizado exitosamente"),
        @ApiResponse(responseCode = "403", description = "No autorizado"),
        @ApiResponse(responseCode = "404", description = "Umbral no encontrado"),
    })
    public ResponseEntity<EnvironmentThresholdDto> updateThreshold(@PathVariable Integer id, @RequestBody EnvironmentThresholdDto dto) {
        EnvironmentThresholdDto updated = thresholdService.updateThreshold(id, dto);
        return ResponseEntity.ok(updated);
    }

    /**
     * Elimina un umbral específico.
     *
     * <p>Requiere autorización de rol ADMIN.</p>
     *
     * @param id identificador del umbral a eliminar
     * @return respuesta sin contenido (204 No Content)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Eliminar un umbral / Delete a threshold")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Umbral eliminado exitosamente"),
        @ApiResponse(responseCode = "403", description = "No autorizado"),
    })
    public ResponseEntity<Void> deleteThreshold(@PathVariable Integer id) {
        thresholdService.deleteThreshold(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Actualiza todos los umbrales de una métrica específica en una sola operación.
     *
     * <p>Requiere autorización de rol ADMIN.</p>
     *
     * @param metric nombre de la métrica a actualizar
     * @param thresholds lista de nuevos umbrales para esa métrica
     * @return lista actualizada de umbrales para esa métrica
     */
    @PutMapping("/metric/{metric}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualizar todos los umbrales de una métrica / Update all thresholds for a metric")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Umbrales actualizados exitosamente"),
        @ApiResponse(responseCode = "403", description = "No autorizado"),
    })
    public ResponseEntity<List<EnvironmentThresholdDto>> updateMetricThresholds(
        @PathVariable String metric,
        @RequestBody List<EnvironmentThresholdDto> thresholds
    ) {
        thresholdService.updateMetricThresholds(metric, thresholds);
        return ResponseEntity.ok(thresholdService.getThresholdsForMetric(metric));
    }

    /**
     * Elimina todos los umbrales asociados a una métrica específica.
     *
     * <p>Requiere autorización de rol ADMIN.</p>
     *
     * @param metric nombre de la métrica cuyos umbrales serán eliminados
     * @return respuesta sin contenido (204 No Content)
     */
    @DeleteMapping("/metric/{metric}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Eliminar todos los umbrales de una métrica / Delete all thresholds for a metric")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Umbrales eliminados exitosamente"),
        @ApiResponse(responseCode = "403", description = "No autorizado"),
    })
    public ResponseEntity<Void> deleteMetricThresholds(@PathVariable String metric) {
        thresholdService.deleteThresholdsForMetric(metric);
        return ResponseEntity.noContent().build();
    }
}
