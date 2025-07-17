package com.jade.move.service;

import com.jade.move.model.Location;
import com.jade.move.repository.LocationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class LocationService {

    private final LocationRepository locationRepository;

    public LocationService(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    public List<Location> getAllLocations() {
        return locationRepository.findAll();
    }

    public Optional<Location> getLocationById(Integer id) {
        return locationRepository.findById(id);
    }

    public Optional<Location> getLocationByDescription(String description) {
        return Optional.ofNullable(locationRepository.findByDescription(description));
    }

    public List<Location> getLocationsByDescriptionContaining(String keyword) {
        return locationRepository.findByDescriptionContaining(keyword);
    }

    public List<Location> getLocationsByLatitudeAndLength(Double latitude, Double length) {
        return locationRepository.findByLatitudeAndLength(latitude, length);
    }

    public Location createLocation(Location location) {
        return locationRepository.save(location);
    }

    public Location updateLocation(Location location) {
        return locationRepository.save(location);
    }

    public void deleteLocation(Integer id) {