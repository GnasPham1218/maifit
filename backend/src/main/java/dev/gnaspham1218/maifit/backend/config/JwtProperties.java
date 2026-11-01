package dev.gnaspham1218.maifit.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

// Bound from application.yaml -> app.jwt.*
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String secret,            // Base64-encoded, at least 32 bytes (256 bits) for HS256
        String issuer,
        Duration accessTokenTtl
) {
}
