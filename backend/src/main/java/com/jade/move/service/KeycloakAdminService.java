package com.jade.move.service;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.ws.rs.NotFoundException;
import java.util.Collections;
import java.util.List;

@Service
public class KeycloakAdminService {

    private static final Logger log = LoggerFactory.getLogger(KeycloakAdminService.class);

    private final Keycloak keycloakAdminClient;

    @Value("${keycloak.realm:move}")
    private String realm;

    @Value("${keycloak.user-roles:user}")
    private String defaultRole;

    public KeycloakAdminService(Keycloak keycloakAdminClient) {
        this.keycloakAdminClient = keycloakAdminClient;
    }

    /**
     * Obtiene todos los usuarios del realm
     */
    public List<UserRepresentation> getAllUsers() {
        return keycloakAdminClient.realm(realm).users().list();
    }

    /**
     * Obtiene un usuario por su ID de Keycloak
     */
    public UserRepresentation getUserById(String userId) {
        try {
            return keycloakAdminClient.realm(realm).users().get(userId).toRepresentation();
        } catch (NotFoundException e) {
            return null;
        }
    }

    /**
     * Crea un usuario en Keycloak
     *
     * @param username Nombre de usuario
     * @param password Contraseña
     * @param email Email del usuario
     * @param firstName Nombre
     * @param lastName Apellido
     * @return ID del usuario creado en Keycloak
     */
    @Transactional
    public String createUser(String username, String password, String email, String firstName, String lastName) {
        UserRepresentation user = new UserRepresentation();
        user.setUsername(username);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEnabled(true);
        user.setEmailVerified(true);

        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(password);
        credential.setTemporary(false);
        user.setCredentials(Collections.singletonList(credential));

        var response = keycloakAdminClient.realm(realm).users().create(user);
        String userId = CreatedResponseUtil.getCreatedId(response);

        assignDefaultRole(userId);

        return userId;
    }

    /**
     * Actualiza los datos de un usuario en Keycloak (email, nombre, apellido)
     */
    @Transactional
    public void updateUser(String userId, String email, String firstName, String lastName) {
        var userResource = keycloakAdminClient.realm(realm).users().get(userId);
        UserRepresentation user = userResource.toRepresentation();
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        userResource.update(user);
    }

    /**
     * Asigna el rol por defecto al usuario
     */
    private void assignDefaultRole(String userId) {
        try {
            var realmResource = keycloakAdminClient.realm(realm);
            RoleRepresentation role = realmResource.roles().get(defaultRole).toRepresentation();
            realmResource.users().get(userId).roles().realmLevel()
                    .add(Collections.singletonList(role));
        } catch (Exception e) {
            log.warn("No se pudo asignar rol '{}' al usuario {}: {}", defaultRole, userId, e.getMessage());
        }
    }

    /**
     * Busca un usuario por username
     */
    public UserRepresentation getUserByUsername(String username) {
        var users = keycloakAdminClient.realm(realm).users().searchByUsername(username, true);
        return users.isEmpty() ? null : users.get(0);
    }

    /**
     * Elimina un usuario de Keycloak
     */
    @Transactional
    public void deleteUser(String userId) {
        keycloakAdminClient.realm(realm).users().delete(userId);
    }

    /**
     * Actualiza contraseña de usuario
     */
    @Transactional
    public void updatePassword(String userId, String newPassword) {
        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(newPassword);
        credential.setTemporary(false);
        keycloakAdminClient.realm(realm).users().get(userId).resetPassword(credential);
    }
}
