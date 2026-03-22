package com.jade.move.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sensors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Sensor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne
    @JoinColumn(name = "device_id", nullable = false, unique = true)
    private Device device;

    @Column(nullable = false, length = 17, unique = true)
    private String macAddress;

    @Column(nullable = false, length = 50)
    private String firmwareVersion;

    @Column(nullable = false)
    private LocalDateTime registeredAt;

    // Internal Keycloak client id used for revocation if provisioning fails
    @Column(name = "keycloak_internal_id", length = 128)
    private String keycloakInternalId;
}
