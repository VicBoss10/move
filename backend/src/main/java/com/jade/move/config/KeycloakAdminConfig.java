package com.jade.move.config;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.Objects;

/**
 * Provides a Keycloak admin client bean configured from application properties.
 *
 * <p>The bean uses username/password grant to obtain administration access to the
 * Keycloak server. Required properties must be provided via configuration.</p>
 *
 * @since 0.0.1
 */
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
    /**
     * Builds and returns a Keycloak admin client instance.
     *
     * <p>Required properties: {@code keycloak.server-url}, {@code keycloak.realm},
     * {@code keycloak.admin-username}, {@code keycloak.admin-password} and optionally
     * {@code keycloak.admin-client-id} (defaults to {@code admin-cli}).</p>
     *
     * @return configured Keycloak admin client
     */
    @Bean
    public Keycloak keycloakAdminClient() {
        Objects.requireNonNull(serverUrl, "KEYCLOAK_SERVER_URL is required");
        Objects.requireNonNull(realm, "KEYCLOAK_REALM is required");
        Objects.requireNonNull(adminUsername, "keycloak.admin-username is required");
        Objects.requireNonNull(adminPassword, "keycloak.admin-password is required");
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
