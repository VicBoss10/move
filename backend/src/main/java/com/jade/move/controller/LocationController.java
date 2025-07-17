package com.jade.move.controller;

import com.jade.move.model.Location;
import com.jade.move.service.LocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/locations")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping
    public List<Location> getAllLocations() {
        return locationService.getAllLocations();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Location> getLocationById(@PathVariable Integer id) {
        Optional<Location> location = locationService.getLocationById(id);
        return location.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/description/{description}")
    public ResponseEntity<Location> getLocationByDescription(@PathVariable String description) {
        Optional<Location> location = locationService.getLocationByDescription(description);
        return location.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public List<Location> getLocationsByDescriptionContaining(@RequestParam String keyword) {
        return locationService.getLocationsByDescriptionContaining(keyword);
    }

    @GetMapping("/coordinates")
    public List<Location> getLocationsByLatitudeAndLength(@RequestParam Double latitude, @RequestParam Double length) {
        return locationService.getLocationsByLatitudeAndLength(latitude, length);
    }

    @PostMapping
    public Location createLocation(@RequestBody Location location) {
        return locationService.createLocation(location);
    }

    @PutMapping
    public Location updateLocation(@RequestBody Location location) {
        return locationService.updateLocation(location);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLocation(@PathVariable Integer id) {
        locationService.deleteLocation(id);
        return ResponseEntity.noContent().build();
    }
}