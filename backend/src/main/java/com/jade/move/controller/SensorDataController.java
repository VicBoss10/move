package com.jade.move.controller;

import com.jade.move.dto.SensorDataSearchCriteria;
import com.jade.move.model.SensorData;
import com.jade.move.service.SensorDataService;
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
@RequestMapping("/sensordata")
@Tag(name = "Datos de Sensores", description = "Gestión y consulta de datos recogidos por los sensores / Managing and querying sensor-collected data")

public class SensorDataController {

    private final SensorDataService sensorDataService;

    public SensorDataController(SensorDataService sensorDataService) {
        this.sensorDataService = sensorDataService;
    }

    @Operation(
            summary = "Get all sensor data / Obtener todos los datos de sensores",
            description = "Retrieves all sensor data records from the system. Returns an informative message if no sensor data is found. / Obtiene todos los registros de datos de sensores del sistema. Devuelve un mensaje informativo si no se encuentran datos de sensores."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sensor data retrieved successfully or no data found / Datos de sensores obtenidos exitosamente o no se encontraron datos"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping
    public ResponseEntity<List<SensorData>> getAllSensorData() {
        List<SensorData> sensorDataList = sensorDataService.getAllSensorData();
        return ResponseEntity.ok(sensorDataList);
    }

    @Operation(
            summary = "Get sensor data by ID / Obtener datos de sensor por ID",
            description = "Retrieves a specific sensor data record by its unique identifier. / Obtiene un registro específico de datos de sensor por su identificador único."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sensor data found successfully / Datos de sensor encontrados exitosamente"),
            @ApiResponse(responseCode = "404", description = "Sensor data not found with the specified ID / Datos de sensor no encontrados con el ID especificado"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/{id}")
    public ResponseEntity<SensorData> getSensorDataById(@PathVariable Integer id) {
        return ResponseEntity.ok(sensorDataService.getSensorDataById(id));
    }

    @Operation(
            summary = "Get sensor data by device ID / Obtener datos de sensor por ID de dispositivo",
            description = "Retrieves all sensor data records associated with a specific device ID. Useful for analyzing data from a particular device. / Obtiene todos los registros de datos de sensores asociados con un ID de dispositivo específico. Útil para analizar datos de un dispositivo particular."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sensor data retrieved successfully or no data found for device / Datos de sensor obtenidos exitosamente o no se encontraron datos para el dispositivo"),
            @ApiResponse(responseCode = "400", description = "Invalid device ID format / Formato de ID de dispositivo inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/device/{deviceId}")
    public ResponseEntity<List<SensorData>> getSensorDataByDeviceId(@PathVariable Integer deviceId) {
        List<SensorData> sensorDataList = sensorDataService.getSensorDataByDeviceId(deviceId);
        return ResponseEntity.ok(sensorDataList);
    }

    @Operation(
            summary = "Search sensor data with criteria / Buscar datos de sensores con criterios",
            description = "Searches sensor data using multiple criteria including temperature, humidity, CO2, PM2.5, PM10 ranges, device/location IDs, and date ranges. All parameters are optional and can be combined for precise filtering. / Busca datos de sensores usando múltiples criterios incluyendo rangos de temperatura, humedad, CO2, PM2.5, PM10, IDs de dispositivo/ubicación y rangos de fechas. Todos los parámetros son opcionales y pueden combinarse para filtrado preciso."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Search completed successfully, data found or no matches / Búsqueda completada exitosamente, datos encontrados o sin coincidencias"),
            @ApiResponse(responseCode = "400", description = "Invalid search criteria or parameter values / Criterios de búsqueda inválidos o valores de parámetros"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/search")
    public ResponseEntity<?> searchSensorData(
            @RequestParam(required = false) Double minTemperature,
            @RequestParam(required = false) Double maxTemperature,
            @RequestParam(required = false) Double minHumidity,
            @RequestParam(required = false) Double maxHumidity,
            @RequestParam(required = false) Double minCo2,
            @RequestParam(required = false) Double maxCo2,
            @RequestParam(required = false) Double minPm25,
            @RequestParam(required = false) Double maxPm25,
            @RequestParam(required = false) Double minPm10,
            @RequestParam(required = false) Double maxPm10,
            @RequestParam(required = false) Integer deviceId,
            @RequestParam(required = false) Integer locationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) Double minCo,
            @RequestParam(required = false) Double maxCo,
            @RequestParam(required = false) Double minNo2,
            @RequestParam(required = false) Double maxNo2,
            @RequestParam(required = false) Double minNh3,
            @RequestParam(required = false) Double maxNh3,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {

        SensorDataSearchCriteria criteria = new SensorDataSearchCriteria();
        criteria.setMinTemperature(minTemperature);
        criteria.setMaxTemperature(maxTemperature);
        criteria.setMinHumidity(minHumidity);
        criteria.setMaxHumidity(maxHumidity);
        criteria.setMinCo2(minCo2);
        criteria.setMaxCo2(maxCo2);
        criteria.setMinPm25(minPm25);
        criteria.setMaxPm25(maxPm25);
        criteria.setMinPm10(minPm10);
        criteria.setMaxPm10(maxPm10);
        criteria.setDeviceId(deviceId);
        criteria.setLocationId(locationId);
        criteria.setStart(start);
        criteria.setEnd(end);
        criteria.setMinCo(minCo);
        criteria.setMaxCo(maxCo);
        criteria.setMinNo2(minNo2);
        criteria.setMaxNo2(maxNo2);
        criteria.setMinNh3(minNh3);
        criteria.setMaxNh3(maxNh3);
        criteria.setPage(page);
        criteria.setSize(size);

        List<SensorData> result = sensorDataService.searchSensorData(criteria);
        return ResponseEntity.ok(result);
    }

    @Operation(
            summary = "Create new sensor data / Crear nuevos datos de sensor",
            description = "Creates a new sensor data record in the system with environmental measurements. All required sensor readings must be provided. / Crea un nuevo registro de datos de sensor en el sistema con mediciones ambientales. Todas las lecturas de sensor requeridas deben proporcionarse."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sensor data created successfully / Datos de sensor creados exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid sensor data or missing required fields / Datos de sensor inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "409", description = "Sensor data already exists / Los datos de sensor ya existen"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PostMapping
    public ResponseEntity<?> createSensorData(@RequestBody SensorData sensorData) {
        SensorData created = sensorDataService.createSensorData(sensorData);
        return ResponseEntity.ok("Sensor data created successfully with id: " + created.getId());
    }

        @Operation(
                        summary = "Bulk create sensor data / Crear lote de datos de sensores",
                        description = "Accepts a JSON array of SensorData objects and persists them in a single bulk operation. / Acepta un array JSON de objetos SensorData y los persiste en una única operación.")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Sensor data bulk persisted successfully / Datos de sensores persistidos correctamente"),
                        @ApiResponse(responseCode = "400", description = "Invalid request body / Cuerpo de petición inválido"),
                        @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
        })
        @PostMapping("/bulk")
        public ResponseEntity<?> createSensorDataBulk(@RequestBody List<SensorData> sensorDataList) {
                if (sensorDataList == null || sensorDataList.isEmpty()) {
                        return ResponseEntity.badRequest().body("Request must be a non-empty JSON array of SensorData");
                }
                List<SensorData> saved = sensorDataService.createBulkSensorData(sensorDataList);
                return ResponseEntity.ok(saved);
        }

    @Operation(
            summary = "Update existing sensor data / Actualizar datos de sensor existentes",
            description = "Updates an existing sensor data record with new measurements. The sensor data ID must be provided in the request body. / Actualiza un registro existente de datos de sensor con nuevas mediciones. El ID de los datos del sensor debe proporcionarse en el cuerpo de la petición."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sensor data updated successfully / Datos de sensor actualizados exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid sensor data or missing required fields / Datos de sensor inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "404", description = "Sensor data not found / Datos de sensor no encontrados"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PutMapping
    public ResponseEntity<?> updateSensorData(@RequestBody SensorData sensorData) {
        SensorData updated = sensorDataService.updateSensorData(sensorData);
        return ResponseEntity.ok("Sensor data updated successfully with id: " + updated.getId());
    }

    @Operation(
            summary = "Delete sensor data by ID / Eliminar datos de sensor por ID",
            description = "Permanently deletes a sensor data record from the system using its unique identifier. This action cannot be undone. / Elimina permanentemente un registro de datos de sensor del sistema usando su identificador único. Esta acción no se puede deshacer."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sensor data deleted successfully / Datos de sensor eliminados exitosamente"),
            @ApiResponse(responseCode = "404", description = "Sensor data not found / Datos de sensor no encontrados"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSensorData(@PathVariable Integer id) {
        sensorDataService.deleteSensorData(id);
        return ResponseEntity.ok("Sensor data deleted successfully with id: " + id);
    }

    @DeleteMapping
    public ResponseEntity<?> deleteAllSensorData() {
        sensorDataService.deleteAllSensorData();
        return ResponseEntity.ok("All sensor data deleted successfully");
    }

    @DeleteMapping("/range")
    public ResponseEntity<?> deleteSensorDataByRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        sensorDataService.deleteSensorDataByDateRange(start, end);
        return ResponseEntity.ok("Sensor data deleted for range " + start + " - " + end);
    }

    @GetMapping("/first")
    public ResponseEntity<?> getFirstSensorData() {
        return ResponseEntity.ok(sensorDataService.getFirstRecord());
    }

    @GetMapping("/last")
    public ResponseEntity<?> getLastSensorData() {
        return ResponseEntity.ok(sensorDataService.getLastRecord());
    }
}