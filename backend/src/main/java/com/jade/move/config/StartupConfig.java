package com.jade.move.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@Configuration
public class StartupConfig {

    private static final Logger log = LoggerFactory.getLogger(StartupConfig.class);

    private static final double DEFAULT_LAT = 0;
    private static final double DEFAULT_LON = 0;
    private static final String DEFAULT_DESC = "Ubicación Provisional";

    @Bean
    public ApplicationRunner createDefaultLocationRunner(JdbcTemplate jdbcTemplate) {
        return args -> createDefaultLocation(jdbcTemplate);
    }

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
