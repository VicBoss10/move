package com.jade.move.config;

import com.jade.move.model.EnvironmentThreshold;
import com.jade.move.repository.EnvironmentThresholdRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * Startup tasks executed when the application boots.
 *
 * <p>This configuration creates a default provisional location record (id=0) in the
 * database if it does not exist. This also initializes default environment thresholds
 * if they don't exist.</p>
 *
 * @since 0.0.1
 */
@Configuration
public class StartupConfig {

    private static final Logger log = LoggerFactory.getLogger(StartupConfig.class);

    private static final double DEFAULT_LAT = 0;
    private static final double DEFAULT_LON = 0;
    private static final String DEFAULT_DESC = "Ubicación Provisional";

    /**
     * Application runner that ensures a default location exists at startup.
     *
     * @param jdbcTemplate JDBC template used to run SQL statements
     * @param thresholdRepository Repository for environment thresholds
     * @return an ApplicationRunner bean
     */
    @Bean
    public ApplicationRunner createDefaultLocationRunner(
            JdbcTemplate jdbcTemplate,
            EnvironmentThresholdRepository thresholdRepository) {
        return args -> {
            createDefaultLocation(jdbcTemplate);
            createDefaultThresholds(thresholdRepository);
        };
    }

    /**
     * Inserts a default location record (id=0) and adjusts the sequence value.
     *
     * <p>The method is transactional and ignores conflicts if the description already
     * exists in the database.</p>
     *
     * @param jdbcTemplate JDBC template used for database operations
     */
    @Transactional
    public void createDefaultLocation(JdbcTemplate jdbcTemplate) {
        try {
            String insertSql = "INSERT INTO locations (id, latitude, longitude, description) VALUES (0, ?, ?, ?) "
                    + "ON CONFLICT (description) DO NOTHING";
            jdbcTemplate.update(insertSql, DEFAULT_LAT, DEFAULT_LON, DEFAULT_DESC);
            String seqSql = "SELECT setval(pg_get_serial_sequence('locations','id'), "
                    + "GREATEST((SELECT COALESCE(MAX(id), 0) FROM locations), 1))";
            jdbcTemplate.execute(seqSql);
        } catch (DataAccessException dae) {
            log.warn("Unable to create default location (id=0): {}", dae.getMessage());
        }
    }

    /**
     * Creates default environment thresholds if they don't already exist.
     *
     * @param thresholdRepository Repository for environment thresholds
     */
    @Transactional
    public void createDefaultThresholds(EnvironmentThresholdRepository thresholdRepository) {
        try {
            Map<String, Map<String, Double>> defaults = getDefaultThresholds();

            for (Map.Entry<String, Map<String, Double>> metricEntry : defaults.entrySet()) {
                String metric = metricEntry.getKey();
                Map<String, Double> levels = metricEntry.getValue();

                // Check if thresholds for this metric already exist
                if (thresholdRepository.findByMetricOrderByLevel(metric).isEmpty()) {
                    for (Map.Entry<String, Double> levelEntry : levels.entrySet()) {
                        String level = levelEntry.getKey();
                        Double maxValue = levelEntry.getValue();

                        EnvironmentThreshold threshold = new EnvironmentThreshold();
                        threshold.setMetric(metric);
                        threshold.setLevel(level);
                        threshold.setMaxValue(maxValue);

                        thresholdRepository.save(threshold);
                    }
                    log.info("Default thresholds created for metric: {}", metric);
                }
            }
        } catch (Exception e) {
            log.warn("Unable to create default environment thresholds: {}", e.getMessage());
        }
    }

    /**
     * Returns the default environment thresholds based on international standards.
     *
     * @return Map of metric -> (level -> maxValue)
     */
    private Map<String, Map<String, Double>> getDefaultThresholds() {
        Map<String, Map<String, Double>> defaults = new HashMap<>();

        // CO₂ - ASHRAE 62.1
        Map<String, Double> co2 = new HashMap<>();
        co2.put("good", 600.0);
        co2.put("moderate", 1000.0);
        co2.put("poor", 1500.0);
        defaults.put("co2", co2);

        // CO - OMS / EPA AQI
        Map<String, Double> co = new HashMap<>();
        co.put("good", 4.4);
        co.put("moderate", 9.4);
        co.put("poor", 12.4);
        defaults.put("co", co);

        // NO₂ - EPA AQI (ppb)
        Map<String, Double> no2 = new HashMap<>();
        no2.put("good", 53.0);
        no2.put("moderate", 100.0);
        no2.put("poor", 360.0);
        defaults.put("no2", no2);

        // NH₃ - OSHA (ppb)
        Map<String, Double> nh3 = new HashMap<>();
        nh3.put("good", 25.0);
        nh3.put("moderate", 50.0);
        nh3.put("poor", 75.0);
        defaults.put("nh3", nh3);

        // PM2.5 - OMS / EPA AQI
        Map<String, Double> pm25 = new HashMap<>();
        pm25.put("good", 12.0);
        pm25.put("moderate", 35.4);
        pm25.put("poor", 55.4);
        defaults.put("pm25", pm25);

        // PM10 - OMS / EPA AQI
        Map<String, Double> pm10 = new HashMap<>();
        pm10.put("good", 54.0);
        pm10.put("moderate", 154.0);
        pm10.put("poor", 254.0);
        defaults.put("pm10", pm10);

        // Temperature - ISO 7730 / ASHRAE 55
        Map<String, Double> temperature = new HashMap<>();
        temperature.put("poor", 15.0);
        temperature.put("good", 24.0);
        temperature.put("moderate", 30.0);
        defaults.put("temperature", temperature);

        // Humidity - ASHRAE 55
        Map<String, Double> humidity = new HashMap<>();
        humidity.put("moderate", 30.0);
        humidity.put("good", 60.0);
        humidity.put("poor", 80.0);
        defaults.put("humidity", humidity);

        return defaults;
    }
}
