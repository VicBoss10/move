package com.jade.move.specification;

import com.jade.move.dto.LocationSearchCriteria;
import com.jade.move.model.Location;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

public class LocationSpecification {

    public static Specification<Location> buildSpecification(LocationSearchCriteria criteria) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (criteria.getDescription() != null && !criteria.getDescription().trim().isEmpty()) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("description")),
                        "%" + criteria.getDescription().toLowerCase() + "%"
                ));
            }

            if (criteria.getKeyword() != null && !criteria.getKeyword().trim().isEmpty()) {
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("description")),
                        "%" + criteria.getKeyword().toLowerCase() + "%"
                ));
            }

            if (criteria.getLatitude() != null) {
                predicates.add(criteriaBuilder.equal(root.get("latitude"), criteria.getLatitude()));
            }

            if (criteria.getLongitude() != null) {
                predicates.add(criteriaBuilder.equal(root.get("longitude"), criteria.getLongitude()));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }
}
