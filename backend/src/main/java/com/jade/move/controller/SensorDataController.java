package com.jade.move.controller;

import com.jade.move.dto.SensorDataSearchCriteria;
import com.jade.move.model.SensorData;
import com.jade.move.service.SensorDataService;
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
 * Controller for managing sensor data records.
 *
 * <p>Provides endpoints to create, search, update, and delete sensor data
 * records. Supports bulk ingestion and range-based deletions.</p>
 *
 * @since 0.0.1
 */
@RestController
@RequestMapping("/sensordata")
@Tag(name = "Datos de Sensores", description = "Gestión y consulta de datos recogidos por los sensores / Managing and querying sensor-collected data")

public class SensorDataController {

    private final SensorDataService sensorDataService;

    public SensorDataController(SensorDataService sensorDataService) {
        this.sensorDataService = sensorDataService;
    }

    /**
     * Retrieves all sensor data records.
     *
     * @return list of all sensor data records
     */
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

    /**
     * Retrieves a sensor data record by identifier.
     *
     * @param id sensor data identifier
     * @return the requested sensor data record
     */
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

    /**
     * Retrieves all sensor data for a given device.
     *
     * @param deviceId device identifier
     * @return list of sensor data for the device
     */
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

    /**
     * Searches sensor data using multiple optional criteria.
     *
     * @param minTemperature optional minimum temperature
     * @param maxTemperature optional maximum temperature
     * @param minHumidity optional minimum humidity
     * @param maxHumidity optional maximum humidity
     * @param minCo2 optional minimum CO2 value
     * @param maxCo2 optional maximum CO2 value
     * @param minPm25 optional min PM2.5
     * @param maxPm25 optional max PM2.5
     * @param minPm10 optional min PM10
     * @param maxPm10 optional max PM10
     * @param deviceId optional device id to filter
     * @param locationId optional location id to filter
     * @param start optional start timestamp for range
     * @param end optional end timestamp for range
     * @param minCo optional min CO
     * @param maxCo optional max CO
     * @param minNo2 optional min NO2
     * @param maxNo2 optional max NO2
     * @param minNh3 optional min NH3
     * @param maxNh3 optional max NH3
     * @param page optional pagination page
     * @param size optional pagination size
     * @return list of sensor data matching criteria
     */
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

    /**
     * Creates a new sensor data record.
     *
     * @param sensorData sensor data payload to create
     * @return confirmation message with created id
     */
    @Operation(
            summary = "Create new sensor data / Crear nuevos datos de sensor",
            description = "Creates a new sensor data record in the system with environmental measurements. All required sensor readings must be provided. / Crea un nuevo registro de datos de sensor en el sistema con mediciones ambientales. Todas las lecturas de sensor requeridas deben proporcionarse."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Sensor data created successfully / Datos de sensor creados exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid sensor data or missing required fields / Datos de sensor inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "409", description = "Sensor data already exists / Los datos de sensor ya existen"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PostMapping
    public ResponseEntity<SensorData> createSensorData(@RequestBody SensorData sensorData) {
        SensorData created = sensorDataService.createSensorData(sensorData);
        return ResponseBuilder.created(created.getId(), "/sensordata", created);
    }

    /**
     * Bulk inserts a list of sensor data records.
     *
     * @param sensorDataList non-empty list of sensor data to persist
     * @return list of saved sensor data records
     */
    @Operation(
            summary = "Bulk create sensor data / Crear lote de datos de sensores",
            description = "Accepts a JSON array of SensorData objects and persists them in a single bulk operation. / Acepta un array JSON de objetos SensorData y los persiste en una única operación.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Sensor data bulk persisted successfully / Datos de sensores persistidos correctamente"),
            @ApiResponse(responseCode = "400", description = "Invalid request body / Cuerpo de petición inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PostMapping("/bulk")
    public ResponseEntity<List<SensorData>> createSensorDataBulk(@RequestBody List<SensorData> sensorDataList) {
        if (sensorDataList == null || sensorDataList.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        List<SensorData> saved = sensorDataService.createBulkSensorData(sensorDataList);
        return ResponseBuilder.created(1, "/sensordata/bulk", saved);
    }

    /**
     * Updates an existing sensor data record.
     *
     * @param sensorData payload with updated sensor data (must contain id)
     * @return confirmation message with updated id
     */
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
    public ResponseEntity<SensorData> updateSensorData(@RequestBody SensorData sensorData) {
        SensorData updated = sensorDataService.updateSensorData(sensorData);
        return ResponseEntity.ok(updated);
    }

    /**
     * Deletes a sensor data record by identifier.
     *
     * @param id sensor data identifier to delete
     * @return confirmation message
     */
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
    public ResponseEntity<Void> deleteSensorData(@PathVariable Integer id) {
        sensorDataService.deleteSensorData(id);
        return ResponseBuilder.noContent();
    }

        /**
         * Deletes all sensor data records from the system.
         *
         * @return 204 No Content response
         */
        @Operation(
                summary = "Delete all sensor data / Eliminar todos los datos de sensores",
                description = "Permanently deletes all sensor data records from the system. This action cannot be undone. / Elimina permanentemente todos los registros de datos de sensores del sistema. Esta acción no se puede deshacer."
        )
        @ApiResponses({
                @ApiResponse(responseCode = "204", description = "All sensor data deleted successfully / Todos los datos de sensores eliminados exitosamente"),
                @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
        })
        @DeleteMapping
        public ResponseEntity<Void> deleteAllSensorData() {
                sensorDataService.deleteAllSensorData();
                return ResponseBuilder.noContent();
        }

        /**
         * Deletes sensor data records within a date-time range.
         *
         * @param start start timestamp (inclusive)
         * @param end end timestamp (inclusive)
         * @return 204 No Content response
         */
        @Operation(
                summary = "Delete sensor data by date range / Eliminar datos de sensores por rango de fecha",
                description = "Permanently deletes all sensor data records within a specified date-time range (inclusive). This action cannot be undone. / Elimina permanentemente todos los registros de datos de sensores dentro de un rango de fecha-hora especificado (inclusive). Esta acción no se puede deshacer."
        )
        @ApiResponses({
                @ApiResponse(responseCode = "204", description = "Sensor data within range deleted successfully / Datos de sensores dentro del rango eliminados exitosamente"),
                @ApiResponse(responseCode = "400", description = "Invalid date range parameters / Parámetros de rango de fecha inválidos"),
                @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
        })
        @DeleteMapping("/range")
        public ResponseEntity<Void> deleteSensorDataByRange(
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
                sensorDataService.deleteSensorDataByDateRange(start, end);
                return ResponseBuilder.noContent();
        }

        /**
         * Deletes sensor data recorded by the devices of a location.
         *
         * @param locationId location identifier
         * @return 204 No Content response
         */
        @Operation(
                summary = "Delete sensor data by location / Eliminar datos de sensores por ubicación",
                description = "Permanently deletes all sensor data recorded by the devices of a location. This action cannot be undone. / Elimina permanentemente todos los datos de sensores registrados por los dispositivos de una ubicación. Esta acción no se puede deshacer."
        )
        @ApiResponses({
                @ApiResponse(responseCode = "204", description = "Sensor data for the location deleted successfully / Datos de sensores de la ubicación eliminados exitosamente"),
                @ApiResponse(responseCode = "400", description = "Invalid location identifier / Identificador de ubicación inválido"),
                @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
        })
        @DeleteMapping("/location/{locationId}")
        public ResponseEntity<Void> deleteSensorDataByLocation(@PathVariable Integer locationId) {
                sensorDataService.deleteSensorDataByLocation(locationId);
                return ResponseBuilder.noContent();
        }

        /**
         * Returns the earliest sensor data record.
         *
         * @return first sensor data record
         */
        @Operation(
                summary = "Get first sensor data record / Obtener el primer registro de datos de sensores",
                description = "Retrieves the earliest sensor data record in the system by timestamp. Useful for determining the data collection start date. / Obtiene el registro de datos de sensores más antiguo en el sistema por marca de tiempo. Útil para determinar la fecha de inicio de la recopilación de datos."
        )
        @ApiResponses({
                @ApiResponse(responseCode = "200", description = "First sensor data record retrieved successfully or no data found / Primer registro de datos de sensores obtenido exitosamente o no se encontraron datos"),
                @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
        })
        @GetMapping("/first")
        public ResponseEntity<?> getFirstSensorData() {
                return ResponseEntity.ok(sensorDataService.getFirstRecord());
        }

        /**
         * Returns the latest sensor data record.
         *
         * @return last sensor data record
         */
        @Operation(
                summary = "Get last sensor data record / Obtener el último registro de datos de sensores",
                description = "Retrieves the most recent sensor data record in the system by timestamp. Useful for determining the latest measurements. / Obtiene el registro de datos de sensores más reciente en el sistema por marca de tiempo. Útil para determinar las mediciones más recientes."
        )
        @ApiResponses({
                @ApiResponse(responseCode = "200", description = "Last sensor data record retrieved successfully or no data found / Último registro de datos de sensores obtenido exitosamente o no se encontraron datos"),
                @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
        })
        @GetMapping("/last")
        public ResponseEntity<?> getLastSensorData() {
                return ResponseEntity.ok(sensorDataService.getLastRecord());
        }
}
