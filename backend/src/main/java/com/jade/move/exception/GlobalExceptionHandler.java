package com.jade.move.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleEntityNotFound(EntityNotFoundException ex, HttpServletRequest req) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        pd.setTitle("Entity not found");
        pd.setDetail(ex.getMessage());
        pd.setType(URI.create("/probs/entity-not-found"));
        pd.setInstance(URI.create(req.getRequestURI()));
        String traceId = getTraceId(req);
        if (traceId != null) pd.setProperty("traceId", traceId);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(pd);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ProblemDetail> handleConflict(ConflictException ex, HttpServletRequest req) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.CONFLICT);
        pd.setTitle("Conflict");
        pd.setDetail(ex.getMessage());
        pd.setType(URI.create("/probs/conflict"));
        pd.setInstance(URI.create(req.getRequestURI()));
        String traceId = getTraceId(req);
        if (traceId != null) pd.setProperty("traceId", traceId);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(pd);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ProblemDetail> handleBadRequest(BadRequestException ex, HttpServletRequest req) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setTitle("Bad request");
        pd.setDetail(ex.getMessage());
        pd.setType(URI.create("/probs/bad-request"));
        pd.setInstance(URI.create(req.getRequestURI()));
        String traceId = getTraceId(req);
        if (traceId != null) pd.setProperty("traceId", traceId);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(pd);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ProblemDetail> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest req) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setTitle("Invalid argument");
        pd.setDetail(ex.getMessage());
        pd.setType(URI.create("/probs/illegal-argument"));
        pd.setInstance(URI.create(req.getRequestURI()));
        String traceId = getTraceId(req);
        if (traceId != null) pd.setProperty("traceId", traceId);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(pd);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ProblemDetail> handleIllegalState(IllegalStateException ex, HttpServletRequest req) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.CONFLICT);
        pd.setTitle("Illegal state");
        pd.setDetail(ex.getMessage());
        pd.setType(URI.create("/probs/illegal-state"));
        pd.setInstance(URI.create(req.getRequestURI()));
        String traceId = getTraceId(req);
        if (traceId != null) pd.setProperty("traceId", traceId);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(pd);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setTitle("Validation failed");
        pd.setDetail("One or more fields are invalid");
        pd.setType(URI.create("/probs/validation-error"));
        pd.setInstance(URI.create(req.getRequestURI()));

        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> Map.of("field", e.getField(), "message", e.getDefaultMessage()))
                .collect(Collectors.toList());
        pd.setProperty("errors", errors);
        String traceId = getTraceId(req);
        if (traceId != null) pd.setProperty("traceId", traceId);
        return ResponseEntity.badRequest().body(pd);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGeneric(Exception ex, HttpServletRequest req) {
        log.error("Unexpected error", ex);
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        pd.setTitle("Internal server error");
        pd.setDetail("An unexpected error occurred");
        pd.setType(URI.create("/probs/internal-server-error"));
        pd.setInstance(URI.create(req.getRequestURI()));
        String traceId = getTraceId(req);
        if (traceId != null) pd.setProperty("traceId", traceId);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(pd);
    }

    private String getTraceId(HttpServletRequest req) {
        String traceId = req.getHeader("X-Trace-Id");
        if (traceId == null) {
            Object attr = req.getAttribute("traceId");
            if (attr != null) traceId = String.valueOf(attr);
        }
        return traceId;
    }
}
