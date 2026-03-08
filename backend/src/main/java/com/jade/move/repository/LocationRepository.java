package com.jade.move.repository;

import com.jade.move.model.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LocationRepository extends JpaRepository<Location, Integer>, JpaSpecificationExecutor<Location> {
    Location findByDescription(String description);
    List<Location> findByDescriptionContaining(String keyword);
    List<Location> findByLatitudeAndLongitude(Double latitude, Double longitude);

    // Consulta personalizada para búsqueda por proximidad usando fórmula de Haversine
    @Query(value = "SELECT * FROM locations l WHERE " +
            "(6371 * acos(cos(radians(:latitude)) * cos(radians(l.latitude)) * " +
            "cos(radians(l.longitude) - radians(:longitude)) + sin(radians(:latitude)) * " +
            "sin(radians(l.latitude)))) <= :radiusKm", nativeQuery = true)
    List<Location> findLocationsByProximity(@Param("latitude") Double latitude,
                                            @Param("longitude") Double longitude,
                                            @Param("radiusKm") Double radiusKm);
}