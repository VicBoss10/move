package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Video camera entity for stream capture.
 *
 * <p>Represents a camera device that captures video streams for processing.
 * Associated with a device on a one-to-one relationship.</p>
 *
 * @since 0.0.1
 */
@Entity
@Table(name="cameras")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Camera {

    /** Unique identifier. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Associated device entity. */
    @OneToOne
    @JoinColumn(name = "device_id", nullable = false, unique = true)
    private Device device;

    /** Stream type (USB, URL, RTSP, YOUTUBE). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StreamType streamType;

    /** Source URL or path for the video stream. */
    @Column(nullable = false, length = 500)
    private String source;
}
