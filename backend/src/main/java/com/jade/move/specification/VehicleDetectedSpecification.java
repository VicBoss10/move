package com.jade.move.specification;

import com.jade.move.dto.VehicleSearchCriteria;
import com.jade.move.model.VehicleDetected;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class VehicleDetectedSpecification {

    public static Specification<VehicleDetected> buildSpecification(VehicleSearchCriteria criteria) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (criteria.getType() != null) {
                predicates.add(criteriaBuilder.equal(root.get("vehicleType"), criteria.getType()));
            }

            if (criteria.getDeviceIds() != null && !criteria.getDeviceIds().isEmpty()) {
                List<Integer> deviceIds = Arrays.stream(criteria.getDeviceIds().split(","))
                        .map(String::trim)
                        .map(Integer::parseInt)
                        .collect(Collectors.toList());
                predicates.add(root.get("device").get("id").in(deviceIds));
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
