package com.jade.move.service;

import com.jade.move.dto.LocationSearchCriteria;
import com.jade.move.model.Location;
import com.jade.move.repository.LocationRepository;
import com.jade.move.specification.LocationSpecification;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

import com.jade.move.exception.EntityNotFoundException;

/**
 * Service for location management.
 *
 * <p>Handles CRUD operations for location entities and provides search
 * capabilities based on description, keywords, and geographic proximity.</p>
 *
 * @since 0.0.1
 */
@Service
public class LocationService {

    private final LocationRepository locationRepository;

    public LocationService(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    /**
     * Retrieves all locations.
     *
     * @return list of all locations
     */
    public List<Location> getAllLocations() {
        return locationRepository.findByIdNot(0);
    }

    /**
     * Retrieves a location by identifier.
     *
     * @param id location identifier
     * @return location data
     * @throws IllegalArgumentException if id is null
     * @throws EntityNotFoundException if location not found
     */
    public Location getLocationById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Location id cannot be null");
        }
        return locationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Location not found with id: " + id));
    }

    /**
     * Retrieves a location by description.
     *
     * @param description location description to match
     * @return optional containing the location if found
     */
    public Optional<Location> getLocationByDescription(String description) {
        return Optional.ofNullable(locationRepository.findByDescription(description));
    }

    /**
     * Searches locations by keyword in description.
     *
     * @param keyword keyword to search
     * @return list of matching locations
     */
    public List<Location> getLocationsByDescriptionContaining(String keyword) {
        return locationRepository.findByDescriptionContaining(keyword);
    }

    /**
     * Finds locations at specific coordinates.
     *
     * @param latitude latitude value
     * @param longitude longitude value
     * @return list of locations at those coordinates
     */
    public List<Location> getLocationsByLatitudeAndLongitude(Double latitude, Double longitude) {
        return locationRepository.findByLatitudeAndLongitude(latitude, longitude);
    }

    /**
     * Creates a new location.
     *
     * @param location location to persist
     * @return created location
     * @throws IllegalArgumentException if location is null
     */
    public Location createLocation(Location location) {
        if (location == null) {
            throw new IllegalArgumentException("Location cannot be null");
        }
        return locationRepository.save(location);
    }

    /**
     * Updates an existing location.
     *
     * @param location location with updated data
     * @return updated location
     * @throws IllegalArgumentException if location is null
     */
    public Location updateLocation(Location location) {
        if (location == null) {
            throw new IllegalArgumentException("Location cannot be null");
        }
        return locationRepository.save(location);
    }

    /**
     * Deletes a location by identifier.
     *
     * @param id location identifier to delete
     * @throws IllegalArgumentException if id is null
     */
    public void deleteLocation(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Location id cannot be null");
        }
        locationRepository.deleteById(id);
    }

    /**
     * Searches locations using flexible criteria.
     *
     * <p>If proximity criteria are provided (latitude, longitude, radius),
     * a geographic query is used; otherwise, specification-based filtering
     * applies the remaining criteria.</p>
     *
     * @param criteria search criteria (all optional)
     * @return list of matching locations
     */
    public List<Location> searchLocations(LocationSearchCriteria criteria) {
        if (criteria.getLatitude() != null && criteria.getLongitude() != null && criteria.getRadiusKm() != null) {
            return locationRepository.findLocationsByProximity(
                    criteria.getLatitude(),
                    criteria.getLongitude(),
                    criteria.getRadiusKm()
            ).stream().filter(l -> l.getId() != 0).toList();
        }

        Specification<Location> spec = LocationSpecification.buildSpecification(criteria);
        return locationRepository.findAll(spec).stream().filter(l -> l.getId() != 0).toList();
    }
}
