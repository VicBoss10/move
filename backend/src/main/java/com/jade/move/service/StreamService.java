package com.jade.move.service;

import com.jade.move.dto.StreamResponse;
import com.jade.move.dto.StreamStopResponse;
import com.jade.move.exception.EntityNotFoundException;
import com.jade.move.model.Camera;
import com.jade.move.model.Device;
import com.jade.move.model.DeviceState;
import com.jade.move.model.DeviceType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.core.ParameterizedTypeReference;

import java.util.HashMap;
import java.util.Map;

@Service
public class StreamService {

    private final CameraService cameraService;
    private final RestTemplate restTemplate;

    @Value("${python.service.url:http://localhost:5000}")
    private String pythonServiceUrl;

    @Value("${python.service.public.url:http://localhost:5000}")
    private String pythonServicePublicUrl;

    public StreamService(CameraService cameraService, RestTemplate restTemplate) {
        this.cameraService = cameraService;
        this.restTemplate = restTemplate;
    }

    public StreamResponse startStream(Integer cameraId) {
        if (cameraId == null) {
            throw new IllegalArgumentException("Camera ID cannot be null");
        }

        Camera camera = cameraService.getCameraById(cameraId);
        Device device = camera.getDevice();

        if (device == null) {
            throw new IllegalStateException("Camera has no associated device");
        }

        if (device.getType() != DeviceType.CAMERA) {
            throw new IllegalArgumentException("Device is not a camera type");
        }

        if (device.getState() != DeviceState.ACTIVE) {
            throw new IllegalStateException("Device is not active. Current state: " + device.getState());
        }

        Map<String, Object> pythonRequest = new HashMap<>();
        pythonRequest.put("streamType", camera.getStreamType().name());
        pythonRequest.put("source", camera.getSource());
        pythonRequest.put("device_id", device.getId());

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

                String streamUrl = pythonServicePublicUrl + "/stream/feed/" + sessionId;

                return new StreamResponse(sessionId, streamUrl, status, streamType, 0);
            } else {
                throw new RuntimeException("Failed to start stream in Python service. Status: " + pythonResponse.getStatusCode());
            }

        } catch (HttpClientErrorException e) {
            throw new RuntimeException("Python service client error: " + e.getStatusCode() + " - " + e.getMessage(), e);
        } catch (RestClientException e) {
            throw new RuntimeException("Error starting stream: " + e.getClass().getSimpleName() + " - " + e.getMessage(), e);
        }
    }

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
                return new StreamStopResponse(message, sessionId);
            } else {
                throw new RuntimeException("Failed to stop stream in Python service");
            }

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new EntityNotFoundException("Stream session not found: " + sessionId);
            }
            throw new RuntimeException("Python service error: " + e.getMessage(), e);
        } catch (RestClientException e) {
            throw new RuntimeException("Python service error: " + e.getMessage(), e);
        }
    }

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

                String streamUrl = pythonServicePublicUrl + "/stream/feed/" + retrievedSessionId;

                return new StreamResponse(
                    retrievedSessionId,
                    streamUrl,
                    isRunning ? status : "stopped",
                    streamType,
                    detectionCount
                );
            } else {
                throw new RuntimeException("Failed to get stream status from Python service");
            }

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new EntityNotFoundException("Stream session not found: " + sessionId);
            }
            throw new RuntimeException("Python service error: " + e.getMessage(), e);
        } catch (RestClientException e) {
            throw new RuntimeException("Python service error: " + e.getMessage(), e);
        }
    }
}