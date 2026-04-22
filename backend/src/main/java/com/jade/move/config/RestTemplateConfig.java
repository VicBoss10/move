package com.jade.move.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for REST client beans.
 *
 * <p>Provides a configured {@link RestTemplate} with sensible connect and read timeouts
 * suitable for backend-to-backend HTTP calls.</p>
 *
 * @since 0.0.1
 */
@Configuration
public class RestTemplateConfig {

    /**
     * Creates a {@link RestTemplate} bean with custom timeouts.
     *
     * @param builder the RestTemplateBuilder injected by Spring Boot
     * @return configured RestTemplate instance
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(30000);

        return builder
                .requestFactory(() -> factory)
                .build();
    }
}
