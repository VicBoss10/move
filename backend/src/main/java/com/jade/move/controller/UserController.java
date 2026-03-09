package com.jade.move.controller;

import com.jade.move.dto.UserRegistrationRequest;
import com.jade.move.service.KeycloakAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
@Tag(name = "Usuarios", description = "Gestión de autenticación y usuarios / User and authentication management")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final KeycloakAdminService keycloakAdminService;

    public UserController(KeycloakAdminService keycloakAdminService) {
        this.keycloakAdminService = keycloakAdminService;
    }

    @Operation(
            summary = "Get all users / Obtener todos los usuarios",
            description = "Retrieves a complete list of all registered users from Keycloak. / Obtiene una lista completa de todos los usuarios registrados en Keycloak."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Users retrieved successfully / Usuarios obtenidos exitosamente"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping
    public ResponseEntity<List<UserRepresentation>> getAllUsers() {
        try {
            return ResponseEntity.ok(keycloakAdminService.getAllUsers());
        } catch (Exception e) {
            log.error("Error retrieving all users", e);
            return ResponseEntity.status(500).build();
        }
    }

    @Operation(
            summary = "Get user by ID / Obtener usuario por ID",
            description = "Retrieves a specific user by their Keycloak ID. / Obtiene un usuario específico por su ID de Keycloak."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User found successfully / Usuario encontrado exitosamente"),
            @ApiResponse(responseCode = "404", description = "User not found / Usuario no encontrado"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        try {
            UserRepresentation user = keycloakAdminService.getUserById(id);
            if (user != null) {
                return ResponseEntity.ok(user);
            }
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        } catch (Exception e) {
            log.error("Error retrieving user with id: {}", id, e);
            return ResponseEntity.status(500).body(Map.of("error", "An error occurred while retrieving the user"));
        }
    }

    @Operation(
            summary = "Create a new user / Crear un nuevo usuario",
            description = "Public endpoint for registering a new user in Keycloak. / Endpoint público para registrar un nuevo usuario en Keycloak."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User created successfully / Usuario creado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid user data / Datos de usuario inválidos"),
            @ApiResponse(responseCode = "409", description = "User already exists / El usuario ya existe"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody UserRegistrationRequest registrationRequest) {
        try {
            var existingUser = keycloakAdminService.getUserByUsername(registrationRequest.getUsername());
            if (existingUser != null) {
                return ResponseEntity.status(409).body(Map.of("error", "User already exists"));
            }

            String keycloakUserId = keycloakAdminService.createUser(
                    registrationRequest.getUsername(),
                    registrationRequest.getPassword(),
                    registrationRequest.getEmail(),
                    registrationRequest.getFirstName(),
                    registrationRequest.getLastName()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("message", "User created successfully");
            response.put("userId", keycloakUserId);
            response.put("username", registrationRequest.getUsername());
            response.put("email", registrationRequest.getEmail());
            return ResponseEntity.status(201).body(response);
        } catch (Exception e) {
            log.error("Error creating user: {}", registrationRequest.getUsername(), e);
            return ResponseEntity.status(500).body(Map.of("error", "An error occurred while creating the user"));
        }
    }

    @Operation(
            summary = "Update an existing user / Actualizar un usuario existente",
            description = "Updates user profile data (email, firstName, lastName) in Keycloak. / Actualiza datos de perfil del usuario en Keycloak."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User updated successfully / Usuario actualizado exitosamente"),
            @ApiResponse(responseCode = "404", description = "User not found / Usuario no encontrado"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody UserRegistrationRequest request) {
        try {
            UserRepresentation existing = keycloakAdminService.getUserById(id);
            if (existing == null) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            keycloakAdminService.updateUser(id, request.getEmail(), request.getFirstName(), request.getLastName());
            return ResponseEntity.ok(Map.of("message", "User updated successfully"));
        } catch (Exception e) {
            log.error("Error updating user with id: {}", id, e);
            return ResponseEntity.status(500).body(Map.of("error", "An error occurred while updating the user"));
        }
    }

    @Operation(
            summary = "Delete user by ID / Eliminar usuario por ID",
            description = "Permanently deletes a user from Keycloak. / Elimina permanentemente un usuario de Keycloak."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User deleted successfully / Usuario eliminado exitosamente"),
            @ApiResponse(responseCode = "404", description = "User not found / Usuario no encontrado"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        try {
            UserRepresentation existing = keycloakAdminService.getUserById(id);
            if (existing == null) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            keycloakAdminService.deleteUser(id);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        } catch (Exception e) {
            log.error("Error deleting user with id: {}", id, e);
            return ResponseEntity.status(500).body(Map.of("error", "An error occurred while deleting the user"));
        }
    }
}
    