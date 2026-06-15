package com.jade.move.service;

import com.jade.move.exception.BadRequestException;
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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

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
    private final RestTemplate restTemplate;

    @Value("${keycloak.realm:move}")
    private String realm;

    @Value("${keycloak.server-url}")
    private String keycloakServerUrl;

    @Value("${keycloak.frontend-client-id:move-frontend}")
    private String frontendClientId;

    @Value("${keycloak.user-roles:user}")
    private String defaultRole;

    public KeycloakAdminService(Keycloak keycloakAdminClient, RestTemplate restTemplate) {
        this.keycloakAdminClient = keycloakAdminClient;
        this.restTemplate = restTemplate;
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

        // Remove existing user/admin roles
        List<String> toRemoveNames = List.of("user", "admin");
        List<RoleRepresentation> currentRoles = userRoles.listAll().stream()
                .filter(r -> toRemoveNames.contains(r.getName()))
                .collect(Collectors.toList());
        if (!currentRoles.isEmpty()) {
            userRoles.remove(currentRoles);
        }

        // Assign the new role
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
     * Assigns the default realm role to a newly created user.
     */
    private void assignDefaultRole(String userId) {
        try {
            var realmResource = keycloakAdminClient.realm(realm);
            RoleRepresentation role = realmResource.roles().get(defaultRole).toRepresentation();
            realmResource.users().get(userId).roles().realmLevel()
                    .add(Collections.singletonList(role));
        } catch (Exception e) {
            log.warn("Could not assign role '{}' to user {}: {}", defaultRole, userId, e.getMessage());
        }
    }

    /**
     * Finds a user by exact username match.
     *
     * @param username username to search for
     * @return user representation, or {@code null} if not found
     */
    public UserRepresentation getUserByUsername(String username) {
        var users = keycloakAdminClient.realm(realm).users().searchByUsername(username, true);
        return users.isEmpty() ? null : users.get(0);
    }

    /**
     * Permanently deletes a user from Keycloak.
     *
     * @param userId user identifier
     */
    @Transactional
    public void deleteUser(String userId) {
        keycloakAdminClient.realm(realm).users().delete(userId);
    }

    /**
     * Verifies that the provided credentials belong to an account with a temporary password
     * and, if so, sets the new password as permanent.
     *
     * <p>Verification is done by calling the Keycloak token endpoint:</p>
     * <ul>
     *   <li>HTTP 200 — account already has a permanent password — rejects with {@link BadRequestException}</li>
     *   <li>HTTP 400 with "Account is not fully set up" — valid temporary password — proceeds</li>
     *   <li>Any other error — invalid credentials — rejects with {@link BadRequestException}</li>
     * </ul>
     *
     * @param email           user email, also used as Keycloak username
     * @param currentPassword the current temporary password to verify
     * @param newPassword     the new permanent password to set
     * @throws BadRequestException     if credentials are invalid or the account is already fully set up
     * @throws EntityNotFoundException if no user is found for the given email
     */
    @Transactional
    public void validateAndResetTemporaryPassword(String email, String currentPassword, String newPassword) {
        String tokenUrl = keycloakServerUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", frontendClientId);
        body.add("username", email);
        body.add("password", currentPassword);
        body.add("scope", "openid");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForEntity(tokenUrl, request, String.class);
            throw new BadRequestException("Account is already fully set up");
        } catch (HttpClientErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            if (!responseBody.contains("Account is not fully set up")) {
                throw new BadRequestException("Invalid credentials");
            }
        }

        var users = keycloakAdminClient.realm(realm).users().searchByEmail(email, true);
        if (users.isEmpty()) {
            throw new EntityNotFoundException("User not found with email: " + email);
        }

        updatePassword(users.get(0).getId(), newPassword);
    }

    /**
     * Updates a user's password in Keycloak, marking it as non-temporary.
     *
     * @param userId      user identifier
     * @param newPassword new password value
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
            // Retrieve the client secret
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
