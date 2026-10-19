package com.app.AnnoncesAPI.config;
import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.app.AnnoncesAPI.security.AuthEntryPointJwt;
import com.app.AnnoncesAPI.security.AuthTokenFilter;
import com.app.AnnoncesAPI.security.MustChangePasswordFilter;
import com.app.AnnoncesAPI.security.PresenceFilter;
import com.app.AnnoncesAPI.security.RateLimitFilter;
import com.app.AnnoncesAPI.services.profiles.UserDetailsServiceImpl;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] SWAGGER_PATHS = {
            "/swagger-ui.html",
            "/swagger-ui/**",
            "/v3/api-docs",
            "/v3/api-docs/**",
            "/swagger-resources/**",
            "/webjars/**"
    };

    private final UserDetailsServiceImpl userDetailsServiceImpl;
    private final AuthEntryPointJwt unauthorizedHandler;
    private final RateLimitFilter rateLimitFilter;
    private final MustChangePasswordFilter mustChangePasswordFilter;
    private final PresenceFilter presenceFilter;

    public SecurityConfig(UserDetailsServiceImpl userDetailsServiceImpl,
                          AuthEntryPointJwt unauthorizedHandler,
                          RateLimitFilter rateLimitFilter,
                          MustChangePasswordFilter mustChangePasswordFilter,
                          PresenceFilter presenceFilter) {
        this.userDetailsServiceImpl = userDetailsServiceImpl;
        this.unauthorizedHandler = unauthorizedHandler;
        this.rateLimitFilter = rateLimitFilter;
        this.mustChangePasswordFilter = mustChangePasswordFilter;
        this.presenceFilter = presenceFilter;
    }

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:8081,http://localhost:4200}")
    private String[] allowedOrigins;

    @Value("${app.security.bcrypt.strength:12}")
    private int bcryptStrength;

    @Bean
    public AuthTokenFilter authenticationJwtTokenFilter() {
        return new AuthTokenFilter();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(bcryptStrength);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With", "X-Client"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Chaîne de sécurité pour les profils non-prod (dev, test, etc.) :
     * Swagger UI accessible publiquement pour faciliter le développement.
     */
    @Bean
    @Profile("!prod")
    public SecurityFilterChain devFilterChain(HttpSecurity http) throws Exception {
        return baseChain(http, /* allowSwagger */ true).build();
    }

    /**
     * Chaîne de sécurité pour le profil prod : Swagger UI denyAll au niveau Security,
     * en complément de springdoc.*.enabled=false (application-prod.yml) et du 404 nginx.
     */
    @Bean
    @Profile("prod")
    public SecurityFilterChain prodFilterChain(HttpSecurity http) throws Exception {
        return baseChain(http, /* allowSwagger */ false).build();
    }

    private HttpSecurity baseChain(HttpSecurity http, boolean allowSwagger) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers
                .contentTypeOptions(ct -> {})
                .frameOptions(fo -> fo.deny())
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
            )
            .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers(HttpMethod.POST, "/api/auth/change-password").authenticated()
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/activate").permitAll()
                    // Pages web des annonces avec aperçu réseaux sociaux (ShareController).
                    .requestMatchers(HttpMethod.GET, "/api/users/*/profil-public").permitAll()
                    .requestMatchers(HttpMethod.GET, "/share/annonce/*").permitAll()
                    .requestMatchers(HttpMethod.GET, "/share/agence/*", "/share/sitemap.xml", "/share/robots.txt").permitAll()
                    // P0.3 — ORDRE INTENTIONNEL : denyAll sur /uploads/private/** DOIT précéder le
                    // permitAll sur /uploads/**. Spring Security évalue ces règles dans l'ordre de
                    // déclaration ; inverser ces deux lignes exposerait les pièces d'identité.
                    .requestMatchers("/uploads/private/**").denyAll()
                    // P0.4 — Les fichiers publics (photos, médias) sont dans /uploads/public/** et accessibles publiquement.
                    .requestMatchers("/uploads/**").permitAll()
                    .requestMatchers("/api/localisations/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/biens-immo").permitAll()
                    .requestMatchers("/api/biens-immo/filter").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/biens-immo/nearby").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/biens-immo/zones-actives").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/biens-immo/user").authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/biens-immo/user/signalements").authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/biens-immo/{id}").permitAll()
                    // Fiche par identifiant public : liens partagés, ouverts sans compte.
                    .requestMatchers(HttpMethod.GET, "/api/biens-immo/public/p/*").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/biens-immo/*/similaires").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/entreprises/*/profil").permitAll()
                    .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                    // Version minimale de l'app (RG-12-21) : lue avant toute connexion.
                    .requestMatchers(HttpMethod.GET, "/api/app/version").permitAll()
                    .requestMatchers("/actuator/**").authenticated()
                    .requestMatchers("/error").permitAll();

                if (allowSwagger) {
                    auth.requestMatchers(SWAGGER_PATHS).permitAll();
                } else {
                    auth.requestMatchers(SWAGGER_PATHS).denyAll();
                }

                auth.anyRequest().authenticated();
            });
        http.addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);
        // P1.2 — Doit être APRÈS AuthTokenFilter pour que SecurityContextHolder soit peuplé.
        http.addFilterAfter(mustChangePasswordFilter, AuthTokenFilter.class);
        // Présence « en ligne » : dernière requête authentifiée (en mémoire).
        http.addFilterAfter(presenceFilter, AuthTokenFilter.class);

        return http;
    }
}
