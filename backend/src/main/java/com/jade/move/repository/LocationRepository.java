package com.jade.move.repository;

import com.jade.move.model.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LocationRepository extends JpaRepository<Location, Integer> {
    Location findByDescription(String description);
    List<Location> findByDescriptionContaining(String keyword);
    List<Location> findByLatitudeAndLength(Double latitude, Double length);
}