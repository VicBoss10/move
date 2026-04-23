package com.jade.move.service;

import com.jade.move.dto.StreamResponse;
import com.jade.move.dto.StreamStopResponse;
import com.jade.move.exception.ConflictException;
import com.jade.move.exception.EntityNotFoundException;
import com.jade.move.model.Camera;
import com.jade.move.model.Device;
import com.jade.move.model.DeviceState;
import com.jade.move.model.StreamSession;
import com.jade.move.model.DeviceType;
import com.jade.move.repository.DeviceRepository;
import com.jade.move.repository.StreamSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for streaming and video session management.
 *
 * <p>Manages streaming sessions by proxying requests to an external
 * Python-based detection service. Persists session state and provides
 * MJPEG feed and snapshot proxying.</p>
 *
 * @since 0.0.1
 */
@Service
public class StreamService {
    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_STOPPED = "stopped";

    private final CameraService cameraService;
    private final DeviceRepository deviceRepository;
    private final RestTemplate restTemplate;
    private final StreamSessionRepository streamSessionRepository;

    @Value("${python.service.url:http://localhost:5000}")
    private String pythonServiceUrl;

    public StreamService(
            CameraService cameraService,
            DeviceRepository deviceRepository,
            RestTemplate restTemplate,
            StreamSessionRepository streamSessionRepository
    ) {
        this.cameraService = cameraService;
        this.deviceRepository = deviceRepository;
        this.restTemplate = restTemplate;
        this.streamSessionRepository = streamSessionRepository;
    }

    /**
     * Starts a video streaming session with vehicle detection.
     *
     * @param cameraId camera identifier
     * @return stream response with session details
     * @throws IllegalArgumentException if cameraId is null
     * @throws EntityNotFoundException if camera not found
     * @throws IllegalStateException if device not active
     */
    @Transactional
    public StreamResponse startStream(Integer cameraId) {
        if (cameraId == null) {
            throw new IllegalArgumentException("Camera ID cannot be null");
        }

        Camera camera = cameraService.getCameraById(cameraId);
        Device device = camera.getDevice();

        if (device == null) {
            throw new IllegalStateException("Camera has no associated device");
        }

        Device lockedDevice = deviceRepository.findByIdForUpdate(device.getId())
                .orElseThrow(() -> new EntityNotFoundException("Device not found with id: " + device.getId()));

        if (lockedDevice.getType() != DeviceType.CAMERA) {
            throw new IllegalArgumentException("Device is not a camera type");
        }

        if (lockedDevice.getState() != DeviceState.ACTIVE) {
            throw new IllegalStateException("Device is not active. Current state: " + lockedDevice.getState());
        }

        // Con el device bloqueado, esta validación se vuelve atómica entre requests concurrentes.
        streamSessionRepository.findFirstByDeviceIdAndStatusOrderByCreatedAtDesc(lockedDevice.getId(), STATUS_ACTIVE)
                .ifPresent(activeSession -> {
                    throw new ConflictException("Stream already active for this camera");
                });

        Map<String, Object> pythonRequest = new HashMap<>();
        pythonRequest.put("streamType", camera.getStreamType().name());
        pythonRequest.put("source", camera.getSource());
        pythonRequest.put("device_id", lockedDevice.getId());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(pythonRequest, headers);

        try {
            ParameterizedTypeReference<Map<String, Object>> typeRef = new ParameterizedTypeReference<>() {};
            ResponseEntity<Map<String, Object>> pythonResponse = restTemplate.exchange(
                pythonServiceUrl + "/stream/start",
                HttpMethod.POST,
                requestEntity,
                typeRef
            );

            Map<String, Object> body = pythonResponse.getBody();
            if (pythonResponse.getStatusCode() == HttpStatus.CREATED && body != null) {
                String sessionId = body.get("sessionId") != null ? body.get("sessionId").toString() : null;
                String status = body.get("status") != null ? body.get("status").toString() : "unknown";
                String streamType = body.get("streamType") != null ? body.get("streamType").toString() : null;

                if (sessionId == null) {
                    throw new RuntimeException("Python service did not return session ID");
                }

                StreamSession streamSession = new StreamSession();
                streamSession.setDevice(lockedDevice);
                streamSession.setSessionId(sessionId);
                streamSession.setStreamUrl(buildProxyStreamUrl(sessionId));
                streamSession.setStatus(status);
                streamSession.setStreamType(streamType);
                streamSession.setCreatedAt(LocalDateTime.now());

                try {
                    streamSessionRepository.save(streamSession);
                } catch (RuntimeException persistenceError) {
                    stopStreamInPython(sessionId);
                    throw new RuntimeException("Failed to persist active stream session", persistenceError);
                }

                return toStreamResponse(streamSession, 0);
            } else {
                throw new RuntimeException("Failed to start stream in Python service. Status: " + pythonResponse.getStatusCode());
            }

        } catch (HttpClientErrorException e) {
            throw new RuntimeException("Python service client error: " + e.getStatusCode() + " - " + e.getMessage(), e);
        } catch (RestClientException e) {
            throw new RuntimeException("Error starting stream: " + e.getClass().getSimpleName() + " - " + e.getMessage(), e);
        }
    }

    /**
     * Stops an active streaming session.
     *
     * @param sessionId session identifier to stop
     * @return stop response confirmation
     * @throws IllegalArgumentException if sessionId is null
     * @throws EntityNotFoundException if session not found
     */
    @Transactional
    public StreamStopResponse stopStream(String sessionId) {
        if (sessionId == null || sessionId.trim().isEmpty()) {
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }

        try {
            ParameterizedTypeReference<Map<String, Object>> typeRef = new ParameterizedTypeReference<>() {};
            ResponseEntity<Map<String, Object>> pythonResponse = restTemplate.exchange(
                pythonServiceUrl + "/stream/stop/" + sessionId,
                HttpMethod.POST,
                null,
                typeRef
            );

            Map<String, Object> body = pythonResponse.getBody();
            if (pythonResponse.getStatusCode() == HttpStatus.OK && body != null) {
                String message = body.get("message") != null ? body.get("message").toString() : "Stream stopped";
                markSessionStopped(sessionId);
                return new StreamStopResponse(message, sessionId);
            } else {
                throw new RuntimeException("Failed to stop stream in Python service");
            }

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                markSessionStopped(sessionId);
                throw new EntityNotFoundException("Stream session not found: " + sessionId);
            }
            throw new RuntimeException("Python service error: " + e.getMessage(), e);
        } catch (RestClientException e) {
            throw new RuntimeException("Python service error: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves status for an active streaming session.
     *
     * @param sessionId session identifier
     * @return stream response with current status
     * @throws IllegalArgumentException if sessionId is null
     * @throws EntityNotFoundException if session not found
     */
    public StreamResponse getStreamStatus(String sessionId) {
        if (sessionId == null || sessionId.trim().isEmpty()) {
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }

        try {
            ParameterizedTypeReference<Map<String, Object>> typeRef = new ParameterizedTypeReference<>() {};
            ResponseEntity<Map<String, Object>> pythonResponse = restTemplate.exchange(
                pythonServiceUrl + "/stream/status/" + sessionId,
                HttpMethod.GET,
                null,
                typeRef
            );

            Map<String, Object> body = pythonResponse.getBody();
            if (pythonResponse.getStatusCode() == HttpStatus.OK && body != null) {
                String retrievedSessionId = body.get("sessionId") != null ? body.get("sessionId").toString() : sessionId;
                String status = body.get("status") != null ? body.get("status").toString() : "unknown";
                String streamType = body.get("streamType") != null ? body.get("streamType").toString() : null;
                Object isRunningObj = body.get("isRunning");
                Boolean isRunning = isRunningObj instanceof Boolean ? (Boolean) isRunningObj : false;
                Object detectionCountObj = body.get("detectionCount");
                Integer detectionCount = detectionCountObj instanceof Integer ? (Integer) detectionCountObj : 0;

                syncPersistedSession(retrievedSessionId, isRunning ? status : STATUS_STOPPED, streamType);

                return new StreamResponse(
                    retrievedSessionId,
                    buildProxyStreamUrl(retrievedSessionId),
                    isRunning ? status : "stopped",
                    streamType,
                    detectionCount
                );
            } else {
                throw new RuntimeException("Failed to get stream status from Python service");
            }

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                markSessionStopped(sessionId);
                throw new EntityNotFoundException("Stream session not found: " + sessionId);
            }
            throw new RuntimeException("Python service error: " + e.getMessage(), e);
        } catch (RestClientException e) {
            throw new RuntimeException("Python service error: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves the active streaming session for a device.
     *
     * @param deviceId device identifier
     * @return stream response if an active session exists
     * @throws IllegalArgumentException if deviceId is null
     */
    @Transactional
    public StreamResponse getActiveStreamByDevice(Integer deviceId) {
        if (deviceId == null) {
            throw new IllegalArgumentException("Device ID cannot be null");
        }

        return streamSessionRepository
                .findFirstByDeviceIdAndStatusOrderByCreatedAtDesc(deviceId, STATUS_ACTIVE)
                .map(session -> toStreamResponse(session, 0))
                .orElseGet(() -> loadActiveStreamFromPython(deviceId));
    }

    /**
     * Proxies an MJPEG stream feed from the detection service.
     *
     * @param sessionId session identifier
     * @return streaming response body with MJPEG frames
     * @throws IllegalArgumentException if sessionId is null
     */
    public StreamingResponseBody proxyStreamFeed(String sessionId) {
        if (sessionId == null || sessionId.trim().isEmpty()) {
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }

        return outputStream -> restTemplate.execute(
                pythonServiceUrl + "/stream/feed/" + sessionId,
                HttpMethod.GET,
                null,
                response -> {
                    try {
                        StreamUtils.copy(response.getBody(), outputStream);
                        outputStream.flush();
                        return null;
                    } catch (IOException ex) {
                        throw new RuntimeException("Error proxying stream feed", ex);
                    }
                }
        );
    }

    /**
     * Proxies a JPEG snapshot from the detection service.
     *
     * @param sessionId session identifier
     * @param width optional width parameter
     * @param quality optional quality parameter
     * @return JPEG bytes
     * @throws IllegalArgumentException if sessionId is null
     */
    public byte[] proxySnapshot(String sessionId, Integer width, Integer quality) {
        if (sessionId == null || sessionId.trim().isEmpty()) {
            throw new IllegalArgumentException("Session ID cannot be null or empty");
        }

        String uri = UriComponentsBuilder
                .fromUriString(pythonServiceUrl + "/stream/snapshot/" + sessionId)
                .queryParamIfPresent("w", java.util.Optional.ofNullable(width))
                .queryParamIfPresent("q", java.util.Optional.ofNullable(quality))
                .build(true)
                .toUriString();

        ResponseEntity<byte[]> response = restTemplate.exchange(
                uri,
                HttpMethod.GET,
                null,
                byte[].class
        );

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Failed to proxy stream snapshot from Python service");
        }

        return response.getBody();
    }

    /**
     * Checks if the Python detection service is available and running
     * @return true if service responds to health check with 200, false otherwise
     */
    public boolean isDetectionServiceHealthy() {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                pythonServiceUrl + "/health",
                String.class
            );
            return response.getStatusCode() == HttpStatus.OK;
        } catch (RestClientException e) {
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private StreamResponse loadActiveStreamFromPython(Integer deviceId) {
        try {
            ParameterizedTypeReference<Map<String, Object>> typeRef = new ParameterizedTypeReference<>() {};
            ResponseEntity<Map<String, Object>> pythonResponse = restTemplate.exchange(
                    pythonServiceUrl + "/streams/active/device/" + deviceId,
                    HttpMethod.GET,
                    null,
                    typeRef
            );

            Map<String, Object> body = pythonResponse.getBody();
            if (!pythonResponse.getStatusCode().is2xxSuccessful() || body == null) {
                throw new EntityNotFoundException("Active stream not found for device id: " + deviceId);
            }

            String sessionId = body.get("sessionId") != null ? body.get("sessionId").toString() : null;
            String status = body.get("status") != null ? body.get("status").toString() : STATUS_ACTIVE;

            if (sessionId == null) {
                throw new EntityNotFoundException("Active stream not found for device id: " + deviceId);
            }

            Camera camera = cameraService.getCameraByDeviceId(deviceId);
            StreamSession streamSession = persistRecoveredSession(camera.getDevice(), sessionId, status, camera.getStreamType().name());
            return toStreamResponse(streamSession, 0);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new EntityNotFoundException("Active stream not found for device id: " + deviceId);
            }
            throw new RuntimeException("Python service error: " + e.getMessage(), e);
        } catch (RestClientException e) {
            throw new RuntimeException("Python service error: " + e.getMessage(), e);
        }
    }

    private StreamSession persistRecoveredSession(Device device, String sessionId, String status, String streamType) {
        return streamSessionRepository.findBySessionId(sessionId).orElseGet(() -> {
            StreamSession recovered = new StreamSession();
            recovered.setDevice(device);
            recovered.setSessionId(sessionId);
            recovered.setStreamUrl(buildProxyStreamUrl(sessionId));
            recovered.setStatus(status);
            recovered.setStreamType(streamType);
            recovered.setCreatedAt(LocalDateTime.now());
            return streamSessionRepository.save(recovered);
        });
    }

    private void syncPersistedSession(String sessionId, String status, String streamType) {
        streamSessionRepository.findBySessionId(sessionId).ifPresent(session -> {
            session.setStatus(status);
            session.setStreamType(streamType);
            if (STATUS_STOPPED.equalsIgnoreCase(status)) {
                session.setStoppedAt(LocalDateTime.now());
            }
            streamSessionRepository.save(session);
        });
    }

    private void closeActiveSessionsForDevice(Integer deviceId) {
        List<StreamSession> activeSessions = new ArrayList<>(streamSessionRepository.findByDeviceIdAndStatus(deviceId, STATUS_ACTIVE));
        if (activeSessions.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        for (StreamSession session : activeSessions) {
            session.setStatus(STATUS_STOPPED);
            session.setStoppedAt(now);
        }
        streamSessionRepository.saveAll(activeSessions);
    }

    private void markSessionStopped(String sessionId) {
        streamSessionRepository.findBySessionId(sessionId).ifPresent(session -> {
            session.setStatus(STATUS_STOPPED);
            session.setStoppedAt(LocalDateTime.now());
            streamSessionRepository.save(session);
        });
    }

    private void stopStreamInPython(String sessionId) {
        try {
            restTemplate.exchange(
                    pythonServiceUrl + "/stream/stop/" + sessionId,
                    HttpMethod.POST,
                    null,
                    Void.class
            );
        } catch (RestClientException ignored) {
            // Evitar ocultar el error original de persistencia.
        }
    }

    private StreamResponse toStreamResponse(StreamSession session, Integer detectionCount) {
        return new StreamResponse(
                session.getSessionId(),
                session.getStreamUrl(),
                session.getStatus(),
                session.getStreamType(),
                detectionCount
        );
    }

    private String buildProxyStreamUrl(String sessionId) {
        return "/streams/feed/" + sessionId;
    }
}
