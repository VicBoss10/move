package com.jade.move.controller;

import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.jade.move.model.Sensor;
import com.jade.move.service.SensorService;
import com.jade.move.util.ResponseBuilder;

/**
 * Controller responsible for sensor management.
 *
 * <p>Exposes endpoints to list, retrieve, update and delete sensors. Note that
 * sensor creation is performed through the device registration flow.</p>
 *
 * @since 0.0.1
 */
@RestController
@RequestMapping("/sensors")
@Tag(name = "Sensores", description = "Gestión de los sensores en el sistema/Managing sensors in the system")
public class SensorController {

        private final SensorService sensorService;

        public SensorController(SensorService sensorService) {
                this.sensorService = sensorService;
        }

    /**
     * Retrieves all registered sensors.
     *
     * @return list of sensors
     */
    @Operation(
            summary = "Get all sensors / Obtener todos los sensores",
            description = "Retrieves a list of all registered sensors in the system. / Obtiene una lista de todos los sensores registrados en el sistema."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sensors retrieved successfully or no sensors found / Sensores obtenidos correctamente o no se encontraron sensores"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping
    public ResponseEntity<List<Sensor>> getAllSensors() {
        List<Sensor> sensors = sensorService.getAllSensors();
        return ResponseEntity.ok(sensors);
    }

    /**
     * Retrieves a sensor by its identifier.
     *
     * @param id sensor identifier
     * @return sensor data
     */
    @Operation(
            summary = "Get a sensor by ID / Obtener un sensor por ID",
            description = "Retrieves a specific sensor by its unique identifier. / Obtiene un sensor específico por su identificador único."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sensor found successfully / Sensor encontrado exitosamente"),
            @ApiResponse(responseCode = "404", description = "Sensor not found / Sensor no encontrado"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Sensor> getSensorById(@PathVariable Integer id) {
        return ResponseEntity.ok(sensorService.getSensorById(id));
    }

    /**
     * Retrieves the sensor associated with a given device identifier.
     *
     * @param deviceId device identifier
     * @return associated sensor
     */
    @Operation(
            summary = "Get a sensor by device ID / Obtener un sensor por ID de dispositivo",
            description = "Retrieves a specific sensor associated with a device. / Obtiene un sensor específico asociado con un dispositivo."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sensor found successfully / Sensor encontrado exitosamente"),
            @ApiResponse(responseCode = "404", description = "Sensor not found / Sensor no encontrado"),
            @ApiResponse(responseCode = "400", description = "Invalid device ID format / Formato de ID de dispositivo inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/device/{deviceId}")
    public ResponseEntity<Sensor> getSensorByDeviceId(@PathVariable Integer deviceId) {
        return ResponseEntity.ok(sensorService.getSensorByDeviceId(deviceId));
    }

    @Operation(
            summary = "Update an existing sensor / Actualizar un sensor existente",
            description = "Updates an existing sensor with new information. The sensor ID must be provided in the request body. / Actualiza un sensor existente con nueva información. El ID del sensor debe proporcionarse en el cuerpo de la petición."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sensor updated successfully / Sensor actualizado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid sensor data or missing required fields / Datos de sensor inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "404", description = "Sensor not found / Sensor no encontrado"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PutMapping
    public ResponseEntity<Sensor> updateSensor(@RequestBody Sensor sensor) {
        Sensor updatedSensor = sensorService.updateSensor(sensor);
        return ResponseEntity.ok(updatedSensor);
    }

    /**
     * Deletes a sensor by its identifier.
     *
     * @param id sensor identifier to delete
     * @return confirmation message
     */
    @Operation(
            summary = "Delete a sensor by ID / Eliminar un sensor por ID",
            description = "Permanently deletes a sensor from the system using its unique identifier. This action cannot be undone. / Elimina permanentemente un sensor del sistema usando su identificador único."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Sensor deleted successfully / Sensor eliminado exitosamente"),
            @ApiResponse(responseCode = "404", description = "Sensor not found / Sensor no encontrado"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSensor(@PathVariable Integer id) {
        sensorService.deleteSensor(id);
        return ResponseBuilder.noContent();
    }
}
