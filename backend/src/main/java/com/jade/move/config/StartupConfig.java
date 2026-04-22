package com.jade.move.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/**
 * Startup tasks executed when the application boots.
 *
 * <p>This configuration creates a default provisional location record (id=0) in the
 * database if it does not exist. This ensures the system has a fallback location.</p>
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
     * @return an ApplicationRunner bean
     */
    @Bean
    public ApplicationRunner createDefaultLocationRunner(JdbcTemplate jdbcTemplate) {
        return args -> createDefaultLocation(jdbcTemplate);
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
}
