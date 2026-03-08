package com.jade.move.controller;

import com.jade.move.model.User;
import com.jade.move.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/users")
@Tag(name = "Usuarios", description = "Gestión de autenticación y usuarios / User and authentication management")

public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @Operation(
            summary = "Get all users / Obtener todos los usuarios",
            description = "Retrieves a complete list of all registered users in the system. Returns an informative message if no users are found. / Obtiene una lista completa de todos los usuarios registrados en el sistema. Devuelve un mensaje informativo si no se encuentran usuarios."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Users retrieved successfully or no users found / Usuarios obtenidos exitosamente o no se encontraron usuarios"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @Operation(
            summary = "Get user by ID / Obtener usuario por ID",
            description = "Retrieves a specific user by their unique identifier. User IDs are typically string values. / Obtiene un usuario específico por su identificador único. Los IDs de usuario son típicamente valores de cadena."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User found successfully / Usuario encontrado exitosamente"),
            @ApiResponse(responseCode = "404", description = "User not found with the specified ID / Usuario no encontrado con el ID especificado"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        Optional<User> user = userService.getUserById(id);
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        } else {
            return ResponseEntity.status(404).body("User not found with id: " + id);
        }
    }

    @Operation(
            summary = "Create a new user / Crear un nuevo usuario",
            description = "Creates a new user in the system with the provided information. Checks for existing users with the same ID to prevent duplicates. All required fields must be included. / Crea un nuevo usuario en el sistema con la información proporcionada. Verifica usuarios existentes con el mismo ID para prevenir duplicados. Todos los campos requeridos deben incluirse."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User created successfully / Usuario creado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid user data or missing required fields / Datos de usuario inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "409", description = "User already exists with the specified ID / El usuario ya existe con el ID especificado"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        Optional<User> existingUser = userService.getUserById(user.getId());
        if (existingUser.isPresent()) {
            return ResponseEntity.status(409).body("User already exists with id: " + user.getId());
        }
        User createdUser = userService.createUser(user);
        return ResponseEntity.ok("User created successfully with id: " + createdUser.getId());
    }

    @Operation(
            summary = "Update an existing user / Actualizar un usuario existente",
            description = "Updates an existing user with new information. The user ID must be provided in the request body and the user must exist in the system. / Actualiza un usuario existente con nueva información. El ID del usuario debe proporcionarse en el cuerpo de la petición y el usuario debe existir en el sistema."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User updated successfully / Usuario actualizado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Invalid user data or missing required fields / Datos de usuario inválidos o faltan campos requeridos"),
            @ApiResponse(responseCode = "404", description = "User not found / Usuario no encontrado"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @PutMapping
    public ResponseEntity<?> updateUser(@RequestBody User user) {
        User updatedUser = userService.updateUser(user);
        return ResponseEntity.ok("User updated successfully with id: " + updatedUser.getId());
    }

    @Operation(
            summary = "Delete user by ID / Eliminar usuario por ID",
            description = "Permanently deletes a user from the system using their unique identifier. This action cannot be undone and may affect related data. / Elimina permanentemente un usuario del sistema usando su identificador único. Esta acción no se puede deshacer y puede afectar datos relacionados."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User deleted successfully / Usuario eliminado exitosamente"),
            @ApiResponse(responseCode = "404", description = "User not found with the specified ID / Usuario no encontrado con el ID especificado"),
            @ApiResponse(responseCode = "400", description = "Invalid ID format / Formato de ID inválido"),
            @ApiResponse(responseCode = "409", description = "Cannot delete user due to existing dependencies / No se puede eliminar el usuario debido a dependencias existentes"),
            @ApiResponse(responseCode = "500", description = "Internal server error / Error interno del servidor")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok("User deleted successfully with id: " + id);
    }
}