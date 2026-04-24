package com.jade.move.util;

import org.springframework.http.ResponseEntity;
import java.net.URI;

/**
 * Utility class for building standardized REST responses.
 *
 * <p>Provides helper methods to construct ResponseEntity objects following
 * REST conventions (201 Created with Location header, 204 No Content, etc.).</p>
 */
public class ResponseBuilder {

    /**
     * Creates a 201 Created response with Location header and body.
     *
     * @param resourceId the ID of the created resource
     * @param basePath the base path (e.g., "/cameras")
     * @param body the response body (typically the created resource)
     * @param <T> the type of the response body
     * @return ResponseEntity with 201 status, Location header, and body
     */
    public static <T> ResponseEntity<T> created(Integer resourceId, String basePath, T body) {
        URI location = URI.create(basePath + "/" + resourceId);
        return ResponseEntity.created(location).body(body);
    }

    /**
     * Creates a 201 Created response with Location header and body for String ID.
     *
     * @param resourceId the ID of the created resource (String)
     * @param basePath the base path (e.g., "/users")
     * @param body the response body
     * @param <T> the type of the response body
     * @return ResponseEntity with 201 status, Location header, and body
     */
    public static <T> ResponseEntity<T> created(String resourceId, String basePath, T body) {
        URI location = URI.create(basePath + "/" + resourceId);
        return ResponseEntity.created(location).body(body);
    }

    /**
     * Creates a 204 No Content response (for DELETE operations).
     *
     * @return ResponseEntity with 204 status and no body
     */
    public static ResponseEntity<Void> noContent() {
        return ResponseEntity.noContent().build();
    }
}
