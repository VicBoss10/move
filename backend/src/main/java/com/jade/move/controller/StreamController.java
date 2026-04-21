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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.HashMap;
import java.util.Map;

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

    @Operation(
            summary = "Get active stream by device / Obtener stream activo por dispositivo",
            description = "Returns the persisted active stream session for a device. If the session exists in Python but not yet in DB, it is recovered and persisted. / Devuelve la sesión activa persistida para un dispositivo. Si existe en Python pero aún no en BD, se recupera y persiste."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Active stream found / Stream activo encontrado"),
            @ApiResponse(responseCode = "404", description = "Active stream not found / Stream activo no encontrado")
    })
    @GetMapping("/active/device/{deviceId}")
    public ResponseEntity<StreamResponse> getActiveStreamByDevice(@PathVariable Integer deviceId) {
        return ResponseEntity.ok(streamService.getActiveStreamByDevice(deviceId));
    }

    @Operation(
            summary = "Proxy stream feed / Proxyear feed del stream",
            description = "Relays the MJPEG feed from the Python detection service through the main backend so clients do not access the internal service directly. / Reenvía el feed MJPEG desde el servicio Python a través del backend principal para que los clientes no accedan directamente al servicio interno."
    )
    @GetMapping(value = "/feed/{sessionId}", produces = "multipart/x-mixed-replace; boundary=frame")
    public ResponseEntity<StreamingResponseBody> proxyStreamFeed(@PathVariable String sessionId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("multipart/x-mixed-replace; boundary=frame"));
        headers.setCacheControl("no-store, no-cache, must-revalidate, max-age=0");
        headers.add("X-Accel-Buffering", "no");
        headers.add("Connection", "keep-alive");
        return ResponseEntity.ok().headers(headers).body(streamService.proxyStreamFeed(sessionId));
    }

    @Operation(
            summary = "Proxy stream snapshot / Proxyear snapshot del stream",
            description = "Relays a single JPEG frame from the Python detection service. Used by Safari/iOS fallback mode. / Reenvía un frame JPEG del servicio Python. Usado por el fallback de Safari/iOS."
    )
    @GetMapping(value = "/snapshot/{sessionId}", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> proxyStreamSnapshot(
            @PathVariable String sessionId,
            @RequestParam(required = false, name = "w") Integer width,
            @RequestParam(required = false, name = "q") Integer quality
    ) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_JPEG);
        headers.setCacheControl("no-store, no-cache, must-revalidate, max-age=0");
        headers.add("Pragma", "no-cache");
        headers.add("Expires", "0");
        return ResponseEntity.ok().headers(headers).body(streamService.proxySnapshot(sessionId, width, quality));
    }

    @Operation(
            summary = "Check detection service health / Verificar salud del servicio de detección",
            description = "Checks if the Python vehicle detection service is running and available. Always returns 200 with status in JSON body. / Verifica si el servicio de detección de vehículos Python está corriendo. Siempre retorna 200 con el estado en el body."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Health check completed / Verificación completada")
    })
    @GetMapping("/health/detection-service")
    public ResponseEntity<Map<String, String>> checkDetectionServiceHealth() {
        boolean isHealthy = streamService.isDetectionServiceHealthy();
        Map<String, String> response = new HashMap<>();
        response.put("status", isHealthy ? "HEALTHY" : "UNAVAILABLE");
        response.put("service", "vehicle-detection");
        
        // Siempre retornar 200 OK - el estado está en el JSON
        return ResponseEntity.ok(response);
    }
}
