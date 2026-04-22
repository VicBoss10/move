package com.jade.move.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Converts a JWT token into a Spring Security authentication token.
 *
 * <p>This converter extracts role information from common Keycloak claim locations
 * and maps them to Spring Security {@link GrantedAuthority} instances. It supports
 * both the {@code realm_access.roles} structure and a top-level {@code roles} claim.</p>
 *
 * @since 0.0.1
 */
@Component
public class JwtAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private static final String REALM_ACCESS_CLAIM = "realm_access";
    private static final String ROLES_CLAIM = "roles";
    private static final String ROLE_PREFIX = "ROLE_";

    /**
     * Convert the given {@link Jwt} into an {@link AbstractAuthenticationToken}.
     *
     * @param source the JWT to convert
     * @return an authentication token containing authorities extracted from the token
     */
    @Override
    public AbstractAuthenticationToken convert(Jwt source) {
        Collection<GrantedAuthority> authorities = extractAuthorities(source);
        return new JwtAuthenticationToken(source, authorities);
    }

    /**
     * Extracts role claims from the JWT and maps them to {@link GrantedAuthority}.
     *
     * <p>This method first attempts to read roles from the {@code realm_access.roles}
     * structure (Keycloak standard). If no roles are found there, it falls back to
     * a top-level {@code roles} claim.</p>
     *
     * @param jwt the JWT token
     * @return collection of granted authorities (may be empty)
     */
    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        Map<String, Object> realmAccess = jwt.getClaimAsMap(REALM_ACCESS_CLAIM);
        if (realmAccess != null) {
            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) realmAccess.get(ROLES_CLAIM);
            if (roles != null) {
                authorities.addAll(roles.stream()
                        .map(role -> new SimpleGrantedAuthority(ROLE_PREFIX + role.toUpperCase()))
                        .collect(Collectors.toList()));
            }
        }

        if (authorities.isEmpty()) {
            List<String> roles = jwt.getClaimAsStringList(ROLES_CLAIM);
            if (roles != null) {
                authorities.addAll(roles.stream()
                        .map(role -> new SimpleGrantedAuthority(ROLE_PREFIX + role.toUpperCase()))
                        .collect(Collectors.toList()));
            }
        }

        return authorities;
    }
}
