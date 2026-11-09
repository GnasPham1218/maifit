package dev.gnaspham1218.maifit.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

// Bound from application.yaml -> app.turnstile.*
@ConfigurationProperties(prefix = "app.turnstile")
public record TurnstileProperties(
        String secretKey,   // server-side key from the Cloudflare dashboard; only in .env, never in code
        String verifyUrl,   // Cloudflare's siteverify endpoint
        Duration timeout    // max wait for Cloudflare before we give up (and refuse the request)
) {
}
