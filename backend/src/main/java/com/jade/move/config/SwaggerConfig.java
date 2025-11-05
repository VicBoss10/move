package com.jade.move.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {
    
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("MOVE API")
                        .description("API REST para el sistema MOVE de monitoreo ambiental")
                        .version("1.0")
                        .contact(new Contact()
                                .name("Victor")
                                .email("your.email@example.com")));
    }
}
