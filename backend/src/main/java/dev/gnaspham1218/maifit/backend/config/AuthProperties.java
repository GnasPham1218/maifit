package dev.gnaspham1218.maifit.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

// Bound from application.yaml -> app.auth.*
@ConfigurationProperties(prefix = "app.auth")
public record AuthProperties(
        String frontendUrl,       // used to build links in emails, e.g. <frontendUrl>/verify-email?token=...
        Duration verifyTokenTtl,
        Duration resetTokenTtl,
        Duration refreshTokenTtl,
        boolean refreshCookieSecure, // true in production (HTTPS only); can be false for local HTTP testing
        String refreshCookiePath     // the cookie is only sent to this path, e.g. /api/auth
) {
}
