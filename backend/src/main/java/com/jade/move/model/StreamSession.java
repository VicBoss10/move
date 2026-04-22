package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "stream_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StreamSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(name = "session_id", nullable = false, unique = true, length = 100)
    private String sessionId;

    @Column(name = "stream_url", nullable = false, length = 500)
    private String streamUrl;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "stream_type", length = 20)
    private String streamType;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "stopped_at")
    private LocalDateTime stoppedAt;
}
