package com.jade.move.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jade.move.model.Location;
import com.jade.move.service.LocationService;

@RestController
@RequestMapping("/locations")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping
    public ResponseEntity<?> getAllLocations() {
        List<Location> locations = locationService.getAllLocations();
        if (locations.isEmpty()) {
            return ResponseEntity.ok("No locations found.");
        }
        return ResponseEntity.ok(locations);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getLocationById(@PathVariable Integer id) {
        Optional<Location> location = locationService.getLocationById(id);
        if (location.isPresent()) {
            return ResponseEntity.ok(location.get());
        } else {
            return ResponseEntity.status(404).body("Location not found with id: " + id);
        }
    }

    @GetMapping("/description/{description}")
    public ResponseEntity<?> getLocationByDescription(@PathVariable String description) {
        Optional<Location> location = locationService.getLocationByDescription(description);
        if (location.isPresent()) {
            return ResponseEntity.ok(location.get());
        } else {
            return ResponseEntity.status(404).body("Location not found with description: " + description);
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> getLocationsByDescriptionContaining(@RequestParam String keyword) {
        List<Location> locations = locationService.getLocationsByDescriptionContaining(keyword);
        if (locations.isEmpty()) {
            return ResponseEntity.ok("No locations found containing: " + keyword);
        }
        return ResponseEntity.ok(locations);
    }

    @GetMapping("/coordinates")
    public ResponseEntity<?> getLocationsByLatitudeAndLength(@RequestParam Double latitude, @RequestParam Double length) {
        List<Location> locations = locationService.getLocationsByLatitudeAndLength(latitude, length);
        if (locations.isEmpty()) {
            return ResponseEntity.ok("No locations found with latitude: " + latitude + " and length: " + length);
        }
        return ResponseEntity.ok(locations);
    }

    @PostMapping
    public ResponseEntity<?> createLocation(@RequestBody Location location) {
        Location createdLocation = locationService.createLocation(location);
        return ResponseEntity.ok("Location created successfully with id: " + createdLocation.getId());
    }

    @PutMapping
    public ResponseEntity<?> updateLocation(@RequestBody Location location) {
        Location updatedLocation = locationService.updateLocation(location);
        return ResponseEntity.ok("Location updated successfully with id: " + updatedLocation.getId());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLocation(@PathVariable Integer id) {
        locationService.deleteLocation(id);
        return ResponseEntity.ok("Location deleted successfully with id: " + id);
    }
}