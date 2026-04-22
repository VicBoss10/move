package com.jade.move.specification;

import com.jade.move.dto.VehicleSearchCriteria;
import com.jade.move.model.VehicleDetected;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

public class VehicleDetectedSpecification {

    public static Specification<VehicleDetected> buildSpecification(VehicleSearchCriteria criteria) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (criteria.getType() != null) {
                predicates.add(criteriaBuilder.equal(root.get("vehicleType"), criteria.getType()));
            }

            if (criteria.getDeviceId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("device").get("id"), criteria.getDeviceId()));
            }

            if (criteria.getStart() != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("timestamp"), criteria.getStart()));
            }

            if (criteria.getEnd() != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("timestamp"), criteria.getEnd()));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }
}
