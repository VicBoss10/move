package com.jade.move.controller;

import com.jade.move.model.User;
import com.jade.move.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userService.getAllUsers();
        if (users.isEmpty()) {
            return ResponseEntity.ok("No users found.");
        }
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        Optional<User> user = userService.getUserById(id);
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        } else {
            return ResponseEntity.status(404).body("User not found with id: " + id);
        }
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        Optional<User> existingUser = userService.getUserById(user.getId());
        if (existingUser.isPresent()) {
            return ResponseEntity.status(409).body("User already exists with id: " + user.getId());
        }
        User createdUser = userService.createUser(user);
        return ResponseEntity.ok("User created successfully with id: " + createdUser.getId());
    }

    @PutMapping
    public ResponseEntity<?> updateUser(@RequestBody User user) {
        User updatedUser = userService.updateUser(user);
        return ResponseEntity.ok("User updated successfully with id: " + updatedUser.getId());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok("User deleted successfully with id: " + id);
    }
}