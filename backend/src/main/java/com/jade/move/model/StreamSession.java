package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Streaming session entity for active video streams.
 *
 * <p>Represents an active or completed video streaming session.
 * Tracks session identity, stream URL, status, and timestamp information.</p>
 *
 * @since 0.0.1
 */
@Entity
@Table(name = "stream_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StreamSession {

    /** Unique identifier. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Associated device entity. */
    @ManyToOne
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    /** Unique session identifier from streaming service. */
    @Column(name = "session_id", nullable = false, unique = true, length = 100)
    private String sessionId;

    /** URL for proxying the stream feed. */
    @Column(name = "stream_url", nullable = false, length = 500)
    private String streamUrl;

    /** Current session status (active, stopped). */
    @Column(nullable = false, length = 20)
    private String status;

    /** Stream type (USB, URL, RTSP, YOUTUBE). */
    @Column(name = "stream_type", length = 20)
    private String streamType;

    /** Session creation timestamp. */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** Session stop timestamp (null if still active). */
    @Column(name = "stopped_at")
    private LocalDateTime stoppedAt;
}
