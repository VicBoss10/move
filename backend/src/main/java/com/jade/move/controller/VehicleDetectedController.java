package com.jade.move.controller;

import com.jade.move.dto.VehicleSearchCriteria;
import com.jade.move.model.VehicleDetected;
import com.jade.move.model.VehicleType;
import com.jade.move.service.VehicleDetectedService;
import com.jade.move.util.ResponseBuilder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Controller for vehicle detection records.
 *
 * <p>Provides endpoints to list, search, create, update and delete records of
 * vehicles detected by the system. Useful for analytics and monitoring.</p>
 *
 * @since 0.0.1
 */
@RestController
@RequestMapping("/vehicles")
@Tag(name = "Vehículos Detectados", description = "Gestión de los vehículos detectados por el sistema / Managing vehicles detected by the system")

public class VehicleDetectedController {

    private final VehicleDetectedService vehicleDetectedService;

    public VehicleDetectedController(VehicleDetectedService vehicleDetectedService) {
        this.vehicleDetectedService = vehicleDetectedService;
    }

    /**
     * Retrieves all vehicle detection records.
     *
     * @return list of detected vehicles
     */
    @Operation(
            summary = "Get all detected vehicles / Obtener todos los vehículos detectados",
            description = "Retrieves a complete list of all vehicles detected by the system. Returns an informative message if no vehicle detections are found. / Obtiene una lista completa de todos los vehículos detectados por el sistema. Devuelve un mensaje informativo si no se encuentran detecciones de vehículos."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Vehicle detections retrieved successfully or no detections found / Detecciones de vehículos obtenidas exitosamente o no se encontraron detecciones"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping
    public ResponseEntity<List<VehicleDetected>> getAllVehicleDetected() {
        List<VehicleDetected> list = vehicleDetectedService.getAllVehicleDetected();
        return ResponseEntity.ok(list);
    }

    /**
     * Retrieves a vehicle detection record by identifier.
     *
     * @param id detection identifier
     * @return detection record
     */
    @Operation(
            summary = "Get detected vehicle by ID / Obtener vehículo detectado por ID",
            description = "Retrieves a specific vehicle detection record by its unique identifier. Useful for getting detailed information about a particular detection event. / Obtiene un registro específico de detección de vehículo por su identificador único. Útil para obtener información detallada sobre un evento de detección particular."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Vehicle detection found successfully / Detección de vehículo encontrada exitosamente"),
            @ApiResponse(responseCode = "404", description = "Vehicle detection not found with the specified ID / Detección de vehículo no encontrada con el ID especificado"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/{id}")
    public ResponseEntity<VehicleDetected> getVehicleDetectedById(@PathVariable Integer id) {
        return ResponseEntity.ok(vehicleDetectedService.getVehicleDetectedById(id));
    }

    /**
     * Searches vehicle detections using optional criteria.
     *
     * @param type optional vehicle type to filter
     * @param deviceId optional device id to filter
     * @param start optional start timestamp for range
     * @param end optional end timestamp for range
     * @return list of matching vehicle detections
     */
    @Operation(
            summary = "Search detected vehicles with criteria / Buscar vehículos detectados con criterios",
            description = "Searches vehicle detection records using multiple criteria including vehicle type, location, and time range. All parameters are optional and can be combined for precise filtering. Useful for traffic analysis and monitoring. / Busca registros de detección de vehículos usando múltiples criterios incluyendo tipo de vehículo, ubicación y rango de tiempo. Todos los parámetros son opcionales y pueden combinarse para filtrado preciso. Útil para análisis de tráfico y monitoreo."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Search completed successfully, vehicles found or no matches / Búsqueda completada exitosamente, vehículos encontrados o sin coincidencias"),
            @ApiResponse(responseCode = "400", description = "Invalid search criteria or parameter values / Criterios de búsqueda inválidos o valores de parámetros"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/search")
    public ResponseEntity<?> searchVehicles(
            @RequestParam(required = false) VehicleType type,
            @RequestParam(required = false) Integer deviceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {

        VehicleSearchCriteria criteria = new VehicleSearchCriteria();
        criteria.setType(type);
        criteria.setDeviceId(deviceId);
        criteria.setStart(start);
        criteria.setEnd(end);

        List<VehicleDetected> vehicles = vehicleDetectedService.searchVehicles(criteria);
        return ResponseEntity.ok(vehicles);
    }

    /**
     * Creates a new vehicle detection record.
     *
     * @param vehicleDetected payload describing the detected vehicle
     * @return confirmation message with created id
     */
    @Operation(
            summary = "Create new vehicle detection record / Crear nuevo registro de detección de vehículo",
            description = "Creates a new vehicle detection record in the system with detection details. All required fields including vehicle type, location, and timestamp must be provided. / Crea un nuevo registro de detección de vehículo en el sistema con detalles de detección. Todos los campos requeridos incluyendo tipo de vehículo, ubicación y marca de tiempo deben proporcionarse."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Vehicle detection created successfully / Detección de vehículo creada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid vehicle detection data or missing required fields / Datos de detección de vehículo inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "409", description = "Vehicle detection already exists / La detección de vehículo ya existe"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PostMapping
    public ResponseEntity<VehicleDetected> createVehicleDetected(@RequestBody VehicleDetected vehicleDetected) {
        VehicleDetected created = vehicleDetectedService.createVehicleDetected(vehicleDetected);
        return ResponseBuilder.created(created.getId(), "/vehicles", created);
    }

    /**
     * Updates an existing vehicle detection record.
     *
     * @param vehicleDetected payload containing updated detection data (must include id)
     * @return confirmation message with updated id
     */
    @Operation(
            summary = "Update existing vehicle detection record / Actualizar registro de detección de vehículo existente",
            description = "Updates an existing vehicle detection record with new information. The detection ID must be provided in the request body and the record must exist in the system. / Actualiza un registro existente de detección de vehículo con nueva información. El ID de detección debe proporcionarse en el cuerpo de la petición y el registro debe existir en el sistema."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Vehicle detection updated successfully / Detección de vehículo actualizada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid vehicle detection data or missing required fields / Datos de detección de vehículo inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "404", description = "Vehicle detection not found / Detección de vehículo no encontrada"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PutMapping
    public ResponseEntity<VehicleDetected> updateVehicleDetected(@RequestBody VehicleDetected vehicleDetected) {
        VehicleDetected updated = vehicleDetectedService.updateVehicleDetected(vehicleDetected);
        return ResponseEntity.ok(updated);
    }

    /**
     * Deletes a vehicle detection record by identifier.
     *
     * @param id detection identifier to delete
     * @return confirmation message
     */
    @Operation(
            summary = "Delete vehicle detection record by ID / Eliminar registro de detección de vehículo por ID",
            description = "Permanently deletes a vehicle detection record from the system using its unique identifier. This action cannot be undone. / Elimina permanentemente un registro de detección de vehículo del sistema usando su identificador único. Esta acción no se puede deshacer."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Vehicle detection deleted successfully / Detección de vehículo eliminada exitosamente"),
            @ApiResponse(responseCode = "404", description = "Vehicle detection not found / Detección de vehículo no encontrada"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVehicleDetected(@PathVariable Integer id) {
        vehicleDetectedService.deleteVehicleDetected(id);
        return ResponseBuilder.noContent();
    }

        /**
         * Deletes all vehicle detection records.
         *
         * @return 204 No Content response
         */
        @DeleteMapping
        public ResponseEntity<Void> deleteAllVehicleDetected() {
                vehicleDetectedService.deleteAllVehicleDetected();
                return ResponseBuilder.noContent();
        }

        /**
         * Deletes vehicle detections within a date-time range.
         *
         * @param start start timestamp (inclusive)
         * @param end end timestamp (inclusive)
         * @return 204 No Content response
         */
        @DeleteMapping("/range")
        public ResponseEntity<Void> deleteVehicleDetectedByRange(
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
                vehicleDetectedService.deleteVehicleDetectedByDateRange(start, end);
                return ResponseBuilder.noContent();
        }

        /**
         * Returns the earliest vehicle detection record.
         *
         * @return first detection record
         */
        @GetMapping("/first")
        public ResponseEntity<?> getFirstVehicleDetected() {
                return ResponseEntity.ok(vehicleDetectedService.getFirstRecord());
        }

        /**
         * Returns the most recent vehicle detection record.
         *
         * @return last detection record
         */
        @GetMapping("/last")
        public ResponseEntity<?> getLastVehicleDetected() {
                return ResponseEntity.ok(vehicleDetectedService.getLastRecord());
        }
}
