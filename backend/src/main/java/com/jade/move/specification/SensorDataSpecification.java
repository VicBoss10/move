package com.jade.move.specification;

import com.jade.move.dto.SensorDataSearchCriteria;
import com.jade.move.model.SensorData;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

public class SensorDataSpecification {

    public static Specification<SensorData> buildSpecification(SensorDataSearchCriteria criteria) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filtros por temperatura
            if (criteria.getMinTemperature() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("temperature"), criteria.getMinTemperature()));
            }
            if (criteria.getMaxTemperature() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("temperature"), criteria.getMaxTemperature()));
            }

            // Filtros por humedad
            if (criteria.getMinHumidity() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("humidity"), criteria.getMinHumidity()));
            }
            if (criteria.getMaxHumidity() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("humidity"), criteria.getMaxHumidity()));
            }

            // Filtros por CO2
            if (criteria.getMinCo2() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("co2"), criteria.getMinCo2()));
            }
            if (criteria.getMaxCo2() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("co2"), criteria.getMaxCo2()));
            }

            // Filtros por PM2.5
            if (criteria.getMinPm25() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("pm25"), criteria.getMinPm25()));
            }
            if (criteria.getMaxPm25() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("pm25"), criteria.getMaxPm25()));
            }

            // Filtros por PM10
            if (criteria.getMinPm10() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("pm10"), criteria.getMinPm10()));
            }
            if (criteria.getMaxPm10() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("pm10"), criteria.getMaxPm10()));
            }

            // Filtros por dispositivo y ubicación
            if (criteria.getDeviceId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("device").get("id"), criteria.getDeviceId()));
            }
            if (criteria.getLocationId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("device").get("location").get("id"), criteria.getLocationId()));
            }

            // Filtros por fecha
            if (criteria.getStart() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("timestamp"), criteria.getStart()));
            }
            if (criteria.getEnd() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("timestamp"), criteria.getEnd()));
            }

            // Filtros por CO
            if (criteria.getMinCo() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("co"), criteria.getMinCo()));
            }
            if (criteria.getMaxCo() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("co"), criteria.getMaxCo()));
            }

            // Filtros por NO2
            if (criteria.getMinNo2() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("no2"), criteria.getMinNo2()));
            }
            if (criteria.getMaxNo2() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("no2"), criteria.getMaxNo2()));
            }

            // Filtros por NH3
            if (criteria.getMinNh3() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("nh3"), criteria.getMinNh3()));
            }
            if (criteria.getMaxNh3() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("nh3"), criteria.getMaxNh3()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}