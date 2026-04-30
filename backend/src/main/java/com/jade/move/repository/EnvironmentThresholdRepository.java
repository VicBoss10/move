package com.jade.move.repository;

import com.jade.move.model.EnvironmentThreshold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for persistence management of environment thresholds.
 *
 * <p>Provides specialized methods to access, create, update, and delete
 * environment metric threshold records in the database.</p>
 */
@Repository
public interface EnvironmentThresholdRepository extends JpaRepository<EnvironmentThreshold, Integer> {

    /**
     * Retrieves all thresholds for a specific metric, ordered by level.
     *
     * @param metric metric name (co2, pm25, temperature, etc.)
     * @return list of thresholds ordered by level
     */
    List<EnvironmentThreshold> findByMetricOrderByLevel(String metric);

    /**
     * Retrieves a specific threshold by metric and level.
     *
     * @param metric metric name
     * @param level threshold level (good, moderate, poor, critical)
     * @return Optional with the found threshold, empty if not exists
     */
    Optional<EnvironmentThreshold> findByMetricAndLevel(String metric, String level);

    /**
     * Retrieves all registered thresholds in the database.
     *
     * @return complete list of thresholds
     */
    @Override
    List<EnvironmentThreshold> findAll();

    /**
     * Deletes all thresholds associated with a specific metric.
     *
     * @param metric metric name whose thresholds will be deleted
     */
    void deleteByMetric(String metric);
}
