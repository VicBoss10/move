package com.jade.move.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configures web security for the application.
 *
 * <p>Defines resource server JWT handling, stateless session management, CORS
 * configuration and request authorization rules for controllers and endpoints.</p>
 *
 * @since 0.0.1
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthConverter jwtAuthConverter;

    @Value("${cors.allowed-origins}")
    private String[] allowedOrigins;

    public SecurityConfig(JwtAuthConverter jwtAuthConverter) {
        this.jwtAuthConverter = jwtAuthConverter;
    }

        /**
         * Security filter chain definition.
         *
         * <p>The filter chain configures stateless session management, JWT validation
         * via the configured {@link JwtAuthConverter}, CORS and per-endpoint authorization
         * rules. The {@code /users} POST endpoint remains public to allow user registration.</p>
         *
         * @param http the HttpSecurity builder
         * @return the configured SecurityFilterChain
         * @throws Exception if configuration fails
         * @implNote Authorization rules grant roles such as ADMIN, USER and DEVICE for the
         * various API groups (devices, locations, cameras, sensors, sensordata, stream).
         */
        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/users", "/users/**", "/devices", "/devices/**", "/locations", "/locations/**",
            "/vehicles", "/vehicles/**", "/cameras", "/cameras/**", "/sensors", "/sensors/**", "/sensordata", "/sensordata/**",
            "/streams", "/streams/**", "/thresholds", "/thresholds/**")
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {
            })
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter)))
            .authorizeHttpRequests(auth -> auth

                .requestMatchers(HttpMethod.POST, "/users").permitAll()
                .requestMatchers(HttpMethod.POST, "/users/reset-temporary-password").permitAll()

                .requestMatchers(HttpMethod.GET, "/users").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/users/{id}").hasAnyRole("ADMIN", "USER")
                .requestMatchers(HttpMethod.PUT, "/users/{id}").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/users/{id}").hasRole("ADMIN")

                .requestMatchers(HttpMethod.GET, "/devices").hasAnyRole("ADMIN", "USER", "DEVICE")
                .requestMatchers(HttpMethod.GET, "/devices/**").hasAnyRole("ADMIN", "USER", "DEVICE")
                .requestMatchers(HttpMethod.POST, "/devices/register-from-device").permitAll()
                .requestMatchers(HttpMethod.POST, "/devices/*/move").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/devices").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/devices/**").hasAnyRole("ADMIN", "DEVICE")
                .requestMatchers(HttpMethod.DELETE, "/devices/**").hasRole("ADMIN")

                .requestMatchers(HttpMethod.GET, "/locations").hasAnyRole("ADMIN", "USER", "DEVICE")
                .requestMatchers(HttpMethod.GET, "/locations/**").hasAnyRole("ADMIN", "USER", "DEVICE")
                .requestMatchers(HttpMethod.POST, "/locations").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/locations/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/locations/**").hasRole("ADMIN")

                .requestMatchers(HttpMethod.GET, "/vehicles").hasAnyRole("ADMIN", "USER")
                .requestMatchers(HttpMethod.GET, "/vehicles/**").hasAnyRole("ADMIN", "USER")
                .requestMatchers(HttpMethod.POST, "/vehicles").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/vehicles/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/vehicles/**").hasRole("ADMIN")

                .requestMatchers(HttpMethod.GET, "/cameras").hasAnyRole("ADMIN", "USER")
                .requestMatchers(HttpMethod.GET, "/cameras/**").hasAnyRole("ADMIN", "USER")
                .requestMatchers(HttpMethod.POST, "/cameras").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/cameras/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/cameras/**").hasRole("ADMIN")

                .requestMatchers(HttpMethod.GET, "/sensors").hasAnyRole("ADMIN", "USER", "DEVICE")
                .requestMatchers(HttpMethod.GET, "/sensors/**").hasAnyRole("ADMIN", "USER", "DEVICE")
                .requestMatchers(HttpMethod.POST, "/sensors").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/sensors").hasAnyRole("ADMIN", "DEVICE")
                .requestMatchers(HttpMethod.DELETE, "/sensors/**").hasRole("ADMIN")

                .requestMatchers(HttpMethod.GET, "/sensordata").hasAnyRole("ADMIN", "USER")
                .requestMatchers(HttpMethod.GET, "/sensordata/**").hasAnyRole("ADMIN", "USER")
                .requestMatchers(HttpMethod.POST, "/sensordata").hasAnyRole("ADMIN", "DEVICE")
                .requestMatchers(HttpMethod.PUT, "/sensordata/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/sensordata/**").hasRole("ADMIN")

                .requestMatchers(HttpMethod.GET, "/streams/feed/*", "/streams/snapshot/*").permitAll()
                .requestMatchers("/streams/**").hasAnyRole("ADMIN", "USER", "DEVICE")

                .requestMatchers(HttpMethod.GET, "/thresholds", "/thresholds/**").hasAnyRole("ADMIN", "USER")
                .requestMatchers("/thresholds/**").hasRole("ADMIN")

                .anyRequest().authenticated());

        return http.build();
        }

    /**
     * Configures global CORS mappings using the configured allowed origins.
     *
     * @return a {@link WebMvcConfigurer} that registers CORS mappings
     */
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
