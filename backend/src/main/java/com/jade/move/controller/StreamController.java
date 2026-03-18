package com.jade.move.controller;

import com.jade.move.dto.StreamResponse;
import com.jade.move.dto.StreamStartRequest;
import com.jade.move.dto.StreamStopResponse;
import com.jade.move.service.StreamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/streams")
@Tag(name = "Streaming", description = "Gestión de streaming de video con detección de vehículos / Managing video streaming with vehicle detection")
public class StreamController {

    private final StreamService streamService;

    public StreamController(StreamService streamService) {
        this.streamService = streamService;
    }

    @Operation(
            summary = "Start a video stream / Iniciar un stream de video",
            description = "Starts a new video streaming session with vehicle detection for a specified camera. The camera must be active and properly configured. Returns the stream URL and session information. / Inicia una nueva sesión de streaming de video con detección de vehículos para una cámara específica. La cámara debe estar activa y configurada correctamente. Devuelve la URL del stream e información de la sesión."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Stream started successfully / Stream iniciado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid camera ID or camera not found / ID de cámara inválido o cámara no encontrada"),
            @ApiResponse(responseCode = "409", description = "Device is not active or not a camera type / El dispositivo no está activo o no es tipo cámara"),
            @ApiResponse(responseCode = "500", description = "Internal server error or Python service unavailable / Error interno del servidor o servicio Python no disponible")
    })
    @PostMapping("/start")
    public ResponseEntity<StreamResponse> startStream(@Valid @RequestBody StreamStartRequest request) {
        return ResponseEntity.ok(streamService.startStream(request.getCameraId()));
    }

    @Operation(
            summary = "Stop a video stream / Detener un stream de video",
            description = "Stops an active video streaming session by its session ID. This releases resources and terminates the video processing. / Detiene una sesión activa de streaming de video por su ID de sesión. Esto libera recursos y termina el procesamiento de video."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Stream stopped successfully / Stream detenido exitosamente"),
            @ApiResponse(responseCode = "404", description = "Stream session not found / Sesión de stream no encontrada"),
            @ApiResponse(responseCode = "400", description = "Invalid session ID / ID de sesión inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error or Python service unavailable / Error interno del servidor o servicio Python no disponible")
    })
    @PostMapping("/stop/{sessionId}")
    public ResponseEntity<StreamStopResponse> stopStream(@PathVariable String sessionId) {
        return ResponseEntity.ok(streamService.stopStream(sessionId));
    }

    @Operation(
            summary = "Get stream status / Obtener estado del stream",
            description = "Retrieves the current status of a streaming session including detection count and running state. Useful for monitoring active streams. / Obtiene el estado actual de una sesión de streaming incluyendo el conteo de detecciones y estado de ejecución. Útil para monitorear streams activos."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status retrieved successfully / Estado obtenido exitosamente"),
            @ApiResponse(responseCode = "404", description = "Stream session not found / Sesión de stream no encontrada"),
            @ApiResponse(responseCode = "400", description = "Invalid session ID / ID de sesión inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error or Python service unavailable / Error interno del servidor o servicio Python no disponible")
    })
    @GetMapping("/status/{sessionId}")
    public ResponseEntity<StreamResponse> getStreamStatus(@PathVariable String sessionId) {
        return ResponseEntity.ok(streamService.getStreamStatus(sessionId));
    }
}
