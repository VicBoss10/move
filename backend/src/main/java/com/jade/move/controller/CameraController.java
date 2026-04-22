package com.jade.move.controller;

import java.util.List;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.jade.move.model.Camera;
import com.jade.move.model.StreamType;
import com.jade.move.service.CameraService;
import com.jade.move.util.ResponseBuilder;
import com.jade.move.util.ResponseBuilder;

/**
 * REST controller for camera management.
 *
 * <p>Provides endpoints to list, create, update and delete camera resources, and
 * to query cameras by device or stream type.</p>
 *
 * @since 0.0.1
 */
@RestController
@RequestMapping("/cameras")
@Tag(name = "Cámaras", description = "Gestión de las cámaras en el sistema/Managing cameras in the system")
public class CameraController {

        private final CameraService cameraService;

        public CameraController(CameraService cameraService) {
                this.cameraService = cameraService;
        }

    @Operation(
            summary = "Get all cameras / Obtener todas las cámaras",
            description = "Retrieves a list of all registered cameras in the system. Returns a message if no cameras are found. / Obtiene una lista de todas las cámaras registradas en el sistema. Devuelve un mensaje si no se encuentran cámaras."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Cameras retrieved successfully or no cameras found / Cámaras obtenidas correctamente o no se encontraron cámaras"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
        /**
         * Retrieves all registered cameras.
         *
         * @return ResponseEntity with a list of cameras (may be empty)
         */
        @GetMapping
        public ResponseEntity<List<Camera>> getAllCameras() {
                List<Camera> cameras = cameraService.getAllCameras();
                return ResponseEntity.ok(cameras);
        }

    @Operation(
            summary = "Get a camera by ID / Obtener una cámara por ID",
            description = "Retrieves a specific camera by its unique identifier. / Obtiene una cámara específica por su identificador único."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Camera found successfully / Cámara encontrada exitosamente"),
            @ApiResponse(responseCode = "404", description = "Camera not found / Cámara no encontrada"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
        /**
         * Retrieves a camera by its ID.
         *
         * @param id camera identifier
         * @return ResponseEntity with the camera details
         */
        @GetMapping("/{id}")
        public ResponseEntity<Camera> getCameraById(@PathVariable Integer id) {
                return ResponseEntity.ok(cameraService.getCameraById(id));
        }

    @Operation(
            summary = "Get a camera by device ID / Obtener una cámara por ID de dispositivo",
            description = "Retrieves a specific camera associated with a device. / Obtiene una cámara específica asociada con un dispositivo."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Camera found successfully / Cámara encontrada exitosamente"),
            @ApiResponse(responseCode = "404", description = "Camera not found / Cámara no encontrada"),
            @ApiResponse(responseCode = "400", description = "Invalid device ID format / Formato de ID de dispositivo inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
        /**
         * Retrieves the camera associated with a device.
         *
         * @param deviceId device identifier
         * @return ResponseEntity with the camera associated to the device
         */
        @GetMapping("/device/{deviceId}")
        public ResponseEntity<Camera> getCameraByDeviceId(@PathVariable Integer deviceId) {
                return ResponseEntity.ok(cameraService.getCameraByDeviceId(deviceId));
        }

    @Operation(
            summary = "Get cameras by stream type / Obtener cámaras por tipo de stream",
            description = "Retrieves all cameras of a specific stream type (USB, URL, RTSP, YOUTUBE). / Obtiene todas las cámaras de un tipo de stream específico (USB, URL, RTSP, YOUTUBE)."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Cameras retrieved successfully or no matches found / Cámaras obtenidas exitosamente o sin coincidencias"),
            @ApiResponse(responseCode = "400", description = "Invalid stream type / Tipo de stream inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
        /**
         * Retrieves cameras filtered by stream type.
         *
         * @param streamType stream type filter (e.g., USB, RTSP, URL, YOUTUBE)
         * @return ResponseEntity with a list of matching cameras
         */
        @GetMapping("/type/{streamType}")
        public ResponseEntity<List<Camera>> getCamerasByStreamType(@PathVariable StreamType streamType) {
                List<Camera> cameras = cameraService.getCamerasByStreamType(streamType);
                return ResponseEntity.ok(cameras);
        }

    @Operation(
            summary = "Create a new camera / Crear una nueva cámara",
            description = "Creates a new camera in the system with the provided information. All required fields must be included in the request body. / Crea una nueva cámara en el sistema con la información proporcionada. Todos los campos requeridos deben incluirse en el cuerpo de la petición."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Camera created successfully / Cámara creada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid camera data or missing required fields / Datos de cámara inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "409", description = "Camera already exists for this device / La cámara ya existe para este dispositivo"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
        /**
         * Creates a new camera.
         *
         * @param camera camera payload
         * @return ResponseEntity confirming creation with generated id
         */
        @PostMapping
        public ResponseEntity<Camera> createCamera(@RequestBody Camera camera) {
                Camera createdCamera = cameraService.createCamera(camera);
                return ResponseBuilder.created(createdCamera.getId(), "/cameras", createdCamera);
        }

    @Operation(
            summary = "Update an existing camera / Actualizar una cámara existente",
            description = "Updates an existing camera with new information. The camera ID must be provided in the request body. / Actualiza una cámara existente con nueva información. El ID de la cámara debe proporcionarse en el cuerpo de la petición."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Camera updated successfully / Cámara actualizada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid camera data or missing required fields / Datos de cámara inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "404", description = "Camera not found / Cámara no encontrada"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
        /**
         * Updates an existing camera.
         *
         * @param camera camera payload containing the id to update
         * @return ResponseEntity confirming update with id
         */
        @PutMapping
    public ResponseEntity<Camera> updateCamera(@RequestBody Camera camera) {
        Camera updatedCamera = cameraService.updateCamera(camera);
        return ResponseEntity.ok(updatedCamera);
    }

    @Operation(
            summary = "Delete a camera by ID / Eliminar una cámara por ID",
            description = "Permanently deletes a camera from the system using its unique identifier. This action cannot be undone. / Elimina permanentemente una cámara del sistema usando su identificador único. Esta acción no se puede deshacer."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Camera deleted successfully / Cámara eliminada exitosamente"),
            @ApiResponse(responseCode = "404", description = "Camera not found / Cámara no encontrada"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
        /**
         * Deletes a camera by id.
         *
         * @param id camera id to delete
         * @return ResponseEntity confirming deletion
         */
        @DeleteMapping("/{id}")
        public ResponseEntity<Void> deleteCamera(@PathVariable Integer id) {
                cameraService.deleteCamera(id);
                return ResponseBuilder.noContent();
        }
}
