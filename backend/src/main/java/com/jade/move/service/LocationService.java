package com.jade.move.service;

import com.jade.move.dto.LocationSearchCriteria;
import com.jade.move.model.Location;
import com.jade.move.repository.LocationRepository;
import com.jade.move.specification.LocationSpecification;
import org.springframework.data.jpa.domain.Specification;
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
        locationRepository.deleteById(id);
    }

    public List<Location> searchLocations(LocationSearchCriteria criteria) {
        // Si hay criterios de proximidad, usar consulta específica
        if (criteria.getLatitude() != null && criteria.getLongitude() != null && criteria.getRadiusKm() != null) {
            return locationRepository.findLocationsByProximity(
                    criteria.getLatitude(),
                    criteria.getLongitude(),
                    criteria.getRadiusKm()
            );
        }

        // Usar especificación para otros criterios
        Specification<Location> spec = LocationSpecification.buildSpecification(criteria);
        return locationRepository.findAll(spec);
    }
}