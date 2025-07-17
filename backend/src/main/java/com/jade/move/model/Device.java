package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name="devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100, unique = true)
    private String name;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 20)
    private String state;

    @ManyToOne
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;
}
