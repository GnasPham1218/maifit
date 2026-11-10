package dev.gnaspham1218.maifit.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

// Bound from application.yaml -> app.payos.* (the three keys of the payOS payment channel; only in .env)
@ConfigurationProperties(prefix = "app.payos")
public record PayOsProperties(
        String clientId,
        String apiKey,
        String checksumKey,   // HMAC key: signs our requests and proves a webhook really comes from payOS
        Duration timeout
) {
}
