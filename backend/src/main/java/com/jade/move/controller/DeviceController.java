package com.jade.move.controller;

import java.util.List;

import com.jade.move.dto.DevicesSearchCriteria;
import com.jade.move.dto.RegisterDeviceRequest;
import com.jade.move.dto.RegisterDeviceResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import com.jade.move.model.Device;
import com.jade.move.model.DeviceState;
import com.jade.move.model.DeviceType;
import com.jade.move.service.DeviceService;

/**
 * REST controller for device management.
 *
 * <p>Provides endpoints to list, retrieve, register, update and delete
 * devices. Device provisioning requests are validated using a factory token
 * when coming from the physical device.</p>
 *
 * @since 0.0.1
 */
@RestController
@RequestMapping("/devices")
@Tag(name = "Dispositivos", description = "Gestión de los dispositivos en el sistema/Managing devices in the system")

public class DeviceController {

    private final DeviceService deviceService;

        @Value("${provisioning.factory-token:}")
        private String provisioningFactoryToken;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    /**
     * Returns a list of all registered devices.
     *
     * @return list of devices; an empty list if none exist
     */
    @Operation(
            summary = "Get all devices / Obtener todos los dispositivos",
            description = "Retrieves a list of all registered devices in the system. Returns a message if no devices are found. / Obtiene una lista de todos los dispositivos registrados en el sistema. Devuelve un mensaje si no se encuentran dispositivos."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Devices retrieved successfully or no devices found / Dispositivos obtenidos correctamente o no se encontraron dispositivos"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping
    public ResponseEntity<List<Device>> getAllDevices() {
        List<Device> devices = deviceService.getAllDevices();
        return ResponseEntity.ok(devices);
    }

    /**
     * Retrieves a device by its identifier.
     *
     * @param id device identifier
     * @return device data
     */
    @Operation(
            summary = "Get a device by ID / Obtener un dispositivo por ID",
            description = "Retrieves a specific device by its unique identifier. / Obtiene un dispositivo específico por su identificador único."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Device found successfully / Dispositivo encontrado exitosamente"),
            @ApiResponse(responseCode = "404", description = "Device not found / Dispositivo no encontrado"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Device> getDeviceById(@PathVariable Integer id) {
        return ResponseEntity.ok(deviceService.getDeviceById(id));
    }

    /**
     * Retrieves a device by its unique name.
     *
     * @param name device name
     * @return device data
     */
    @Operation(
            summary = "Get a device by name / Obtener un dispositivo por nombre",
            description = "Retrieves a specific device by its name. Device names should be unique in the system. / Obtiene un dispositivo específico por su nombre. Los nombres de dispositivos deben ser únicos en el sistema."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Device found successfully / Dispositivo encontrado exitosamente"),
            @ApiResponse(responseCode = "404", description = "Device not found / Dispositivo no encontrado"),
            @ApiResponse(responseCode = "400", description = "Invalid name parameter / Parámetro de nombre inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/name/{name}")
    public ResponseEntity<Device> getDeviceByName(@PathVariable String name) {
        return ResponseEntity.ok(deviceService.getDeviceByName(name));
    }

    /**
     * Searches devices using optional criteria such as type, state and location.
     *
     * @param type optional device type
     * @param state optional device state
     * @param locationId optional location identifier
     * @return list of matching devices
     */
    @Operation(
            summary = "Search devices with criteria / Buscar dispositivos con criterios",
            description = "Searches for devices based on multiple criteria including type, state, and location. All parameters are optional. / Busca dispositivos basándose en múltiples criterios incluyendo tipo, estado y ubicación. Todos los parámetros son opcionales."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Search completed successfully, devices found or no matches / Búsqueda completada exitosamente, dispositivos encontrados o sin coincidencias"),
            @ApiResponse(responseCode = "400", description = "Invalid search criteria / Criterios de búsqueda inválidos"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/search")
    public ResponseEntity<?> searchLocations(
            @RequestParam(required = false) DeviceType type,
            @RequestParam(required = false) DeviceState state,
            @RequestParam(required = false) Integer locationId) {

        DevicesSearchCriteria criteria = new DevicesSearchCriteria();
        criteria.setType(type);
        criteria.setState(state);
        criteria.setLocationId(locationId);

        List<Device> devices = deviceService.searchDevices(criteria);
        return ResponseEntity.ok(devices);
    }

    /**
     * Creates a new device (administrative flow).
     *
     * @param request registration request payload
     * @return registration response with device id and details
     */
    @Operation(
            summary = "Create a new device / Crear un nuevo dispositivo",
            description = "Creates a new device in the system with the provided information. All required fields must be included in the request body. / Crea un nuevo dispositivo en el sistema con la información proporcionada. Todos los campos requeridos deben incluirse en el cuerpo de la petición."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Device created successfully / Dispositivo creado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid device data or missing required fields / Datos de dispositivo inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "409", description = "Device already exists / El dispositivo ya existe"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
        @PostMapping
        public ResponseEntity<?> createDevice(@RequestBody RegisterDeviceRequest request) {
                RegisterDeviceResponse response = deviceService.registerDevice(request);
                return ResponseEntity.ok(response);
        }

            /**
             * Registers a device during provisioning (device-initiated).
             *
             * <p>This endpoint validates the X-Factory-Token header and marks the
             * created device as provisional.</p>
             *
             * @param factoryToken factory-provided token header
             * @param request registration payload
             * @return registration response or 401 when token is invalid
             */
            @Operation(
                    summary = "Register device from device (provisioning) / Registrar dispositivo desde el dispositivo",
                    description = "Endpoint usado por dispositivos en modo provisioning (SoftAP). Valida X-Factory-Token y registra el dispositivo en el sistema."
            )
            @ApiResponses({
                    @ApiResponse(responseCode = "200", description = "Device registered successfully / Dispositivo registrado exitosamente"),
                    @ApiResponse(responseCode = "401", description = "Invalid factory token / Token de fábrica inválido"),
                    @ApiResponse(responseCode = "400", description = "Invalid device data / Datos inválidos"),
                    @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
            })
            @PostMapping("/register-from-device")
            public ResponseEntity<?> registerFromDevice(
                    @RequestHeader(value = "X-Factory-Token", required = false) String factoryToken,
                    @RequestBody RegisterDeviceRequest request
            ) {
                                if (provisioningFactoryToken == null || provisioningFactoryToken.isBlank()) {
                                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Provisioning not enabled");
                                }

                                if (factoryToken == null || !factoryToken.equals(provisioningFactoryToken)) {
                                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid factory token");
                                }

                                request.setState(DeviceState.PROVISIONAL);
                                RegisterDeviceResponse response = deviceService.registerDevice(request);
                return ResponseEntity.ok(response);
            }

    /**
     * Updates an existing device.
     *
     * @param device device payload containing updated values
     * @return confirmation message with updated id
     */
    @Operation(
            summary = "Update an existing device / Actualizar un dispositivo existente",
            description = "Updates an existing device with new information. The device ID must be provided in the request body. / Actualiza un dispositivo existente con nueva información. El ID del dispositivo debe proporcionarse en el cuerpo de la petición."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Device updated successfully / Dispositivo actualizado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid device data or missing required fields / Datos de dispositivo inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "404", description = "Device not found / Dispositivo no encontrado"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PutMapping
    public ResponseEntity<?> updateDevice(@RequestBody Device device) {
        Device updatedDevice = deviceService.updateDevice(device);
        return ResponseEntity.ok("Device updated successfully with id: " + updatedDevice.getId());
    }

    /**
     * Deletes a device by identifier.
     *
     * @param id device identifier to delete
     * @return confirmation message
     */
    @Operation(
            summary = "Delete a device by ID / Eliminar un dispositivo por ID",
            description = "Permanently deletes a device from the system using its unique identifier. This action cannot be undone. / Elimina permanentemente un dispositivo del sistema usando su identificador único. Esta acción no se puede deshacer."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Device deleted successfully / Dispositivo eliminado exitosamente"),
            @ApiResponse(responseCode = "404", description = "Device not found / Dispositivo no encontrado"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "409", description = "Cannot delete device due to existing dependencies / No se puede eliminar el dispositivo debido a dependencias existentes"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDevice(@PathVariable Integer id) {
        deviceService.deleteDevice(id);
        return ResponseEntity.ok("Device deleted successfully with id: " + id);
    }
}
