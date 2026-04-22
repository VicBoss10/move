package com.jade.move.specification;

import com.jade.move.dto.DevicesSearchCriteria;
import com.jade.move.model.Device;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

public class DevicesSpecification {
    public static Specification<Device> buildSpecification (DevicesSearchCriteria criteria) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if(criteria.getType() != null) {
                predicates.add(criteriaBuilder.equal(root.get("type"), criteria.getType()));
            }

            if(criteria.getState() != null) {
                predicates.add(criteriaBuilder.equal(root.get("state"), criteria.getState()));
            }

            if(criteria.getLocationId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("locationId"), criteria.getLocationId()));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    };
}
