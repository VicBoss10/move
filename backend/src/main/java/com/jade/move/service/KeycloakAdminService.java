package com.jade.move.service;

import com.jade.move.exception.ConflictException;
import com.jade.move.exception.EntityNotFoundException;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.ClientRepresentation;

import jakarta.ws.rs.core.Response;

import com.jade.move.dto.KeycloakClientInfo;

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
import java.util.stream.Collectors;

import jakarta.ws.rs.WebApplicationException;

/**
 * Service for Keycloak user administration.
 *
 * <p>Manages user creation, updates, deletion, and role assignments
 * via the Keycloak admin client.</p>
 *
 * @since 0.0.1
 */
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
     * Retrieves all users in the realm.
     *
     * @return list of Keycloak users
     */
    public List<UserRepresentation> getAllUsers() {
        return keycloakAdminClient.realm(realm).users().list();
    }

    /**
     * Retrieves a user by Keycloak identifier.
     *
     * @param userId user identifier
     * @return user representation
     * @throws EntityNotFoundException if user not found
     */
    public UserRepresentation getUserById(String userId) {
        try {
            return keycloakAdminClient.realm(realm).users().get(userId).toRepresentation();
        } catch (NotFoundException e) {
            throw new EntityNotFoundException("User not found with id: " + userId);
        }
    }

    /**
     * Creates a new user in Keycloak.
     *
     * @param username username
     * @param password password
     * @param email user email
     * @param firstName first name
     * @param lastName last name
     * @return Keycloak user id
     * @throws ConflictException if user already exists
     */
    @Transactional
    public String createUser(String username, String password, String email, String firstName, String lastName) {
        UserRepresentation existing = getUserByUsername(username);
        if (existing != null) {
            throw new ConflictException("User already exists with username: " + username);
        }

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
     * Retrieves the realm roles for a user.
     *
     * @param userId user identifier
     * @return list of role names
     */
    public List<String> getUserRoles(String userId) {
        return keycloakAdminClient.realm(realm).users().get(userId)
                .roles().realmLevel().listEffective().stream()
                .map(RoleRepresentation::getName)
                .collect(Collectors.toList());
    }

    /**
     * Updates a user's realm role.
     *
     * <p>Removes existing user/admin roles and assigns the new role.</p>
     *
     * @param userId user identifier
     * @param newRole new role name to assign
     */
    @Transactional
    public void setUserRole(String userId, String newRole) {
        var realmResource = keycloakAdminClient.realm(realm);
        var userRoles = realmResource.users().get(userId).roles().realmLevel();

        // Quitar roles existentes user y admin
        List<String> toRemoveNames = List.of("user", "admin");
        List<RoleRepresentation> currentRoles = userRoles.listAll().stream()
                .filter(r -> toRemoveNames.contains(r.getName()))
                .collect(Collectors.toList());
        if (!currentRoles.isEmpty()) {
            userRoles.remove(currentRoles);
        }

        // Asignar el nuevo rol
        RoleRepresentation role = realmResource.roles().get(newRole).toRepresentation();
        userRoles.add(Collections.singletonList(role));
    }

    /**
     * Updates user profile information in Keycloak.
     *
     * @param userId user identifier
     * @param email new email
     * @param firstName new first name
     * @param lastName new last name
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

    /**
     * Crea un client en Keycloak con service account activado para uso de dispositivos.
     * Devuelve clientId y clientSecret.
     */
    @Transactional
    public KeycloakClientInfo createClientForDevice(String baseClientName) {
        try {
            var realmResource = keycloakAdminClient.realm(realm);

            ClientRepresentation client = new ClientRepresentation();
            // clientId must be unique within realm, include timestamp to avoid collisions
            String clientId = baseClientName + "-" + System.currentTimeMillis();
            client.setClientId(clientId);
            client.setName(baseClientName);
            client.setServiceAccountsEnabled(true);
            client.setPublicClient(false);
            client.setStandardFlowEnabled(false);
            client.setDirectAccessGrantsEnabled(false);

            Response response = realmResource.clients().create(client);
            String createdId = CreatedResponseUtil.getCreatedId(response);

            ClientRepresentation created = realmResource.clients().get(createdId).toRepresentation();
            // Obtener secreto del client
            CredentialRepresentation secretRep = realmResource.clients().get(createdId).getSecret();
            String secret = secretRep != null ? secretRep.getValue() : null;

            // Assign 'device' realm role to the service-account user so client_credentials tokens have roles
            try {
                // Ensure role exists (create if missing)
                try {
                    realmResource.roles().get("device").toRepresentation();
                } catch (Exception re) {
                    RoleRepresentation newRole = new RoleRepresentation();
                    newRole.setName("device");
                    realmResource.roles().create(newRole);
                }

                // Get service account user for the client and assign the role
                var saUser = realmResource.clients().get(createdId).getServiceAccountUser();
                if (saUser != null && saUser.getId() != null) {
                    RoleRepresentation deviceRole = realmResource.roles().get("device").toRepresentation();
                    realmResource.users().get(saUser.getId()).roles().realmLevel().add(Collections.singletonList(deviceRole));
                } else {
                    log.warn("Service account user not found for client {}", created.getClientId());
                }
            } catch (Exception e) {
                log.warn("Failed to assign 'device' role to service account for client {}: {}", created.getClientId(), e.getMessage());
            }

            return new KeycloakClientInfo(created.getClientId(), secret, createdId);
        } catch (WebApplicationException e) {
            log.error("Error creating Keycloak client for device {}: {}", baseClientName, e.getMessage());
            throw e;
        }
    }

    /**
     * Elimina un client en Keycloak por su internal id
     */
    @Transactional
    public void deleteClientByInternalId(String internalId) {
        if (internalId == null) return;
        try {
            var realmResource = keycloakAdminClient.realm(realm);
            realmResource.clients().get(internalId).remove();
        } catch (NotFoundException e) {
            log.warn("Keycloak client not found for internalId {}: {}", internalId, e.getMessage());
        } catch (Exception e) {
            log.error("Error deleting Keycloak client {}: {}", internalId, e.getMessage());
            throw e;
        }
    }
}
