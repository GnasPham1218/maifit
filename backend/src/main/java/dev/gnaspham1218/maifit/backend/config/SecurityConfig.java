package dev.gnaspham1218.maifit.backend.config;

import dev.gnaspham1218.maifit.backend.common.security.RestAccessDeniedHandler;
import dev.gnaspham1218.maifit.backend.common.security.RestAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    // Public endpoints, listed one by one: anything not listed requires a valid JWT.
    // Paths are relative to the /api context path.
    private static final String[] PUBLIC_ENDPOINTS = {
            "/actuator/health",
            "/error",
            "/auth/register",
            "/auth/verify-email",
            "/auth/login",
            "/auth/refresh",
            "/auth/logout",
            "/auth/forgot-password",
            "/auth/reset-password",
            // Landing page: price and daily limits from the config, nothing about a user
            "/payments/pricing",
            // Called by the payment gateway's servers (no JWT); authenticated by the provider's
            // own check inside PaymentProvider.parseWebhook (payOS: HMAC signature)
            "/payments/webhook/*"
    };

    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;
    private final JwtAuthenticationConverter jwtAuthenticationConverter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // No cookies are used for authentication of normal requests (Bearer header), so CSRF is off.
                // The refresh-token cookie is SameSite=Strict (step 6).
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .anyRequest().authenticated())
                // Reads "Authorization: Bearer <token>" and validates it with the JwtDecoder bean
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                // Same handlers when there is no token at all
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler));
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
