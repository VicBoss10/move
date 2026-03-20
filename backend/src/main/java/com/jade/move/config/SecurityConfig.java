package com.jade.move.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthConverter jwtAuthConverter;

    @Value("${cors.allowed-origins}")
    private String[] allowedOrigins;

    public SecurityConfig(JwtAuthConverter jwtAuthConverter) {
        this.jwtAuthConverter = jwtAuthConverter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // Solo aplicar OAuth2 a los endpoints que necesitan protección
        // POST /users está EXCLUIDO de aquí - es completamente público
        http.securityMatcher("/users", "/users/**", "/devices", "/devices/**", "/locations", "/locations/**",
                "/vehicles", "/vehicles/**", "/cameras", "/cameras/**", "/sensor-data", "/sensor-data/**", "/stream/**")
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {})
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter))
                )
                .authorizeHttpRequests(auth -> auth
                        
                        // POST /users es PÚBLICO (registro)
                        .requestMatchers(HttpMethod.POST, "/users").permitAll()
                        
                        // Endpoints Protegidos - Usuarios (solo ADMIN)
                        .requestMatchers(HttpMethod.GET, "/users").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/users/{id}").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.PUT, "/users/{id}").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/users/{id}").hasRole("ADMIN")
                        
                        // Endpoints Protegidos - Devices
                        .requestMatchers(HttpMethod.GET, "/devices").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.GET, "/devices/**").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.POST, "/devices").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/devices/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/devices/**").hasRole("ADMIN")
                        
                        // Endpoints Protegidos - Locations
                        .requestMatchers(HttpMethod.GET, "/locations").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.GET, "/locations/**").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.POST, "/locations").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/locations/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/locations/**").hasRole("ADMIN")
                        
                        // Endpoints Protegidos - Vehicles
                        .requestMatchers(HttpMethod.GET, "/vehicles").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.GET, "/vehicles/**").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.POST, "/vehicles").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/vehicles/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/vehicles/**").hasRole("ADMIN")
                        
                        // Endpoints Protegidos - Cameras
                        .requestMatchers(HttpMethod.GET, "/cameras").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.GET, "/cameras/**").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.POST, "/cameras").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/cameras/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/cameras/**").hasRole("ADMIN")
                        
                        // Endpoints Protegidos - Sensor Data
                        .requestMatchers(HttpMethod.GET, "/sensor-data").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.GET, "/sensor-data/**").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.POST, "/sensor-data").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/sensor-data/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/sensor-data/**").hasRole("ADMIN")
                        
                        // Endpoints Protegidos - Streaming
                        .requestMatchers("/stream/**").hasAnyRole("ADMIN", "USER")
                        
                        // Todos los demás endpoints requieren autenticación
                        .anyRequest().authenticated()
                );
        
        return http.build();
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(allowedOrigins)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                        .allowedHeaders("*")
                        .allowCredentials(false)
                        .maxAge(3600);
            }
        };
    }

}
