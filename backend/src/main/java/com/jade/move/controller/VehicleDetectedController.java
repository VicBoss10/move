package com.jade.move.controller;

import com.jade.move.dto.VehicleSearchCriteria;
import com.jade.move.model.VehicleDetected;
import com.jade.move.model.VehicleType;
import com.jade.move.service.VehicleDetectedService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/vehicles")
@Tag(name = "Vehículos Detectados", description = "Gestión de los vehículos detectados por el sistema / Managing vehicles detected by the system")

public class VehicleDetectedController {

    private final VehicleDetectedService vehicleDetectedService;

    public VehicleDetectedController(VehicleDetectedService vehicleDetectedService) {
        this.vehicleDetectedService = vehicleDetectedService;
    }

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
            @RequestParam(required = false) Integer locationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {

        VehicleSearchCriteria criteria = new VehicleSearchCriteria();
        criteria.setType(type);
        criteria.setLocationId(locationId);
        criteria.setStart(start);
        criteria.setEnd(end);

        List<VehicleDetected> vehicles = vehicleDetectedService.searchVehicles(criteria);
        return ResponseEntity.ok(vehicles);
    }

    @Operation(
            summary = "Create new vehicle detection record / Crear nuevo registro de detección de vehículo",
            description = "Creates a new vehicle detection record in the system with detection details. All required fields including vehicle type, location, and timestamp must be provided. / Crea un nuevo registro de detección de vehículo en el sistema con detalles de detección. Todos los campos requeridos incluyendo tipo de vehículo, ubicación y marca de tiempo deben proporcionarse."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Vehicle detection created successfully / Detección de vehículo creada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid vehicle detection data or missing required fields / Datos de detección de vehículo inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "409", description = "Vehicle detection already exists / La detección de vehículo ya existe"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PostMapping
    public ResponseEntity<?> createVehicleDetected(@RequestBody VehicleDetected vehicleDetected) {
        VehicleDetected created = vehicleDetectedService.createVehicleDetected(vehicleDetected);
        return ResponseEntity.ok("VehicleDetected created successfully with id: " + created.getId());
    }

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
    public ResponseEntity<?> updateVehicleDetected(@RequestBody VehicleDetected vehicleDetected) {
        VehicleDetected updated = vehicleDetectedService.updateVehicleDetected(vehicleDetected);
        return ResponseEntity.ok("VehicleDetected updated successfully with id: " + updated.getId());
    }

    @Operation(
            summary = "Delete vehicle detection record by ID / Eliminar registro de detección de vehículo por ID",
            description = "Permanently deletes a vehicle detection record from the system using its unique identifier. This action cannot be undone. / Elimina permanentemente un registro de detección de vehículo del sistema usando su identificador único. Esta acción no se puede deshacer."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Vehicle detection deleted successfully / Detección de vehículo eliminada exitosamente"),
            @ApiResponse(responseCode = "404", description = "Vehicle detection not found / Detección de vehículo no encontrada"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVehicleDetected(@PathVariable Integer id) {
        vehicleDetectedService.deleteVehicleDetected(id);
        return ResponseEntity.ok("VehicleDetected deleted successfully with id: " + id);
    }

    @DeleteMapping
    public ResponseEntity<?> deleteAllVehicleDetected() {
        vehicleDetectedService.deleteAllVehicleDetected();
        return ResponseEntity.ok("All vehicle detections deleted successfully");
    }

    @DeleteMapping("/range")
    public ResponseEntity<?> deleteVehicleDetectedByRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        vehicleDetectedService.deleteVehicleDetectedByDateRange(start, end);
        return ResponseEntity.ok("Vehicle detections deleted for range " + start + " - " + end);
    }

    @GetMapping("/first")
    public ResponseEntity<?> getFirstVehicleDetected() {
        return ResponseEntity.ok(vehicleDetectedService.getFirstRecord());
    }

    @GetMapping("/last")
    public ResponseEntity<?> getLastVehicleDetected() {
        return ResponseEntity.ok(vehicleDetectedService.getLastRecord());
    }
}