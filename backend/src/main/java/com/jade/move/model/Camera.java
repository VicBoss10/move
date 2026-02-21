package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name="cameras")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Camera {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne
    @JoinColumn(name = "device_id", nullable = false, unique = true)
    private Device device;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StreamType streamType;

    @Column(nullable = false, length = 500)
    private String source;
}
