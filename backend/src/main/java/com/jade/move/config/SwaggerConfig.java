package com.jade.move.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI / Swagger configuration for API metadata.
 *
 * @since 0.0.1
 */
@Configuration
public class SwaggerConfig {

    /**
     * Creates the OpenAPI bean with basic API information.
     *
     * @return configured OpenAPI instance
     */
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("MOVE API")
                        .description("REST API for the MOVE environmental monitoring system")
                        .version("1.0")
                        .contact(new Contact()
                                .name("Victor")
                                .email("your.email@example.com")));
    }
}
