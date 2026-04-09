package com.jade.move.config;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.Objects;

@Configuration
public class KeycloakAdminConfig {

    @Value("${keycloak.server-url}")
    private String serverUrl;

    @Value("${keycloak.realm}")
    private String realm;
    @Value("${keycloak.admin-client-id:admin-cli}")
    private String adminClientId;

    @Value("${keycloak.admin-username}")
    private String adminUsername;

    @Value("${keycloak.admin-password}")
    private String adminPassword;
    @Bean
    public Keycloak keycloakAdminClient() {
        // Fail fast if required env vars are missing
        Objects.requireNonNull(serverUrl, "KEYCLOAK_SERVER_URL is required");
        Objects.requireNonNull(realm, "KEYCLOAK_REALM is required");
        // Back to username/password mode: require admin username, password and client id
        Objects.requireNonNull(adminUsername, "keycloak.admin-username is required");
        Objects.requireNonNull(adminPassword, "keycloak.admin-password is required");

        // Use admin client id from property (default 'admin-cli')
        Objects.requireNonNull(adminClientId, "keycloak.admin-client-id is required");

        return KeycloakBuilder.builder()
            .serverUrl(serverUrl)
            .realm("master")
            .username(adminUsername)
            .password(adminPassword)
            .clientId(adminClientId)
            .grantType("password")
            .build();
    }
}
