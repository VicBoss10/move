package com.jade.move.controller;

import java.util.List;

import com.jade.move.dto.LocationSearchCriteria;
import com.jade.move.model.Location;
import com.jade.move.service.LocationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/locations")
@Tag(name = "Ubicaciones", description = "Gestión de ubicaciones / locations management")

public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @Operation(
            summary = "Get all locations / Obtener todas las ubicaciones",
            description = "Returns a complete list of all registered locations in the system. If no locations exist, returns an informative message. / Devuelve una lista completa de todas las ubicaciones registradas en el sistema. Si no existen ubicaciones, devuelve un mensaje informativo."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Locations retrieved successfully or no locations found / Ubicaciones obtenidas exitosamente o no se encontraron ubicaciones"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping
    public ResponseEntity<List<Location>> getAllLocations() {
        List<Location> locations = locationService.getAllLocations();
        return ResponseEntity.ok(locations);
    }

    @Operation(
            summary = "Get location by ID / Obtener ubicación por ID",
            description = "Returns the location that matches the given unique identifier. Useful for retrieving specific location details. / Devuelve la ubicación que coincide con el identificador único proporcionado. Útil para obtener detalles específicos de una ubicación."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Location found successfully / Ubicación encontrada exitosamente"),
            @ApiResponse(responseCode = "404", description = "Location not found with the specified ID / Ubicación no encontrada con el ID especificado"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Location> getLocationById(@PathVariable Integer id) {
        return ResponseEntity.ok(locationService.getLocationById(id));
    }

    @Operation(
            summary = "Search locations / Buscar ubicaciones",
            description = "Searches locations using flexible criteria including description text, keywords, and geographic coordinates with radius. All parameters are optional and can be combined for more precise results. / Busca ubicaciones usando criterios flexibles incluyendo texto de descripción, palabras clave y coordenadas geográficas con radio. Todos los parámetros son opcionales y pueden combinarse para resultados más precisos."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Search completed successfully, locations found or no matches / Búsqueda completada exitosamente, ubicaciones encontradas o sin coincidencias"),
            @ApiResponse(responseCode = "400", description = "Invalid search parameters or coordinate values / Parámetros de búsqueda inválidos o valores de coordenadas"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/search")
    public ResponseEntity<?> searchLocations(
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double radiusKm) {

        LocationSearchCriteria criteria = new LocationSearchCriteria();
        criteria.setDescription(description);
        criteria.setKeyword(keyword);
        criteria.setLatitude(latitude);
        criteria.setLongitude(longitude);
        criteria.setRadiusKm(radiusKm);

        List<Location> locations = locationService.searchLocations(criteria);
        return ResponseEntity.ok(locations);
    }

    @Operation(
            summary = "Create a new location / Crear una nueva ubicación",
            description = "Creates a new location in the system and returns confirmation with the generated ID. All required fields must be provided in the request body. / Crea una nueva ubicación en el sistema y devuelve confirmación con el ID generado. Todos los campos requeridos deben proporcionarse en el cuerpo de la petición."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Location created successfully / Ubicación creada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid location data or missing required fields / Datos de ubicación inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "409", description = "Location already exists / La ubicación ya existe"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PostMapping
    public ResponseEntity<?> createLocation(@RequestBody Location location) {
        Location createdLocation = locationService.createLocation(location);
        return ResponseEntity.ok("Location created successfully with id: " + createdLocation.getId());
    }

    @Operation(
            summary = "Update an existing location / Actualizar una ubicación existente",
            description = "Updates an existing location with the provided data and returns confirmation with the location ID. The location must exist in the system. / Actualiza una ubicación existente con los datos proporcionados y devuelve confirmación con el ID de la ubicación. La ubicación debe existir en el sistema."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Location updated successfully / Ubicación actualizada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid location data or missing required fields / Datos de ubicación inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "404", description = "Location not found / Ubicación no encontrada"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PutMapping
    public ResponseEntity<?> updateLocation(@RequestBody Location location) {
        Location updatedLocation = locationService.updateLocation(location);
        return ResponseEntity.ok("Location updated successfully with id: " + updatedLocation.getId());
    }

    @Operation(
            summary = "Delete location by ID / Eliminar ubicación por ID",
            description = "Permanently deletes the location with the specified ID from the system. This operation cannot be undone and may affect related entities. / Elimina permanentemente la ubicación con el ID especificado del sistema. Esta operación no se puede deshacer y puede afectar entidades relacionadas."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Location deleted successfully / Ubicación eliminada exitosamente"),
            @ApiResponse(responseCode = "404", description = "Location not found with the specified ID / Ubicación no encontrada con el ID especificado"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "409", description = "Cannot delete location due to existing dependencies / No se puede eliminar la ubicación debido a dependencias existentes"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLocation(@PathVariable Integer id) {
        locationService.deleteLocation(id);
        return ResponseEntity.ok("Location deleted successfully with id: " + id);
    }
}