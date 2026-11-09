package dev.gnaspham1218.maifit.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

// Bound from application.yaml -> app.rate-limit.*
// Per-email limits in the backend; per-IP limits live in Nginx (deploy/nginx/maifit.conf).
@ConfigurationProperties(prefix = "app.rate-limit")
public record RateLimitProperties(
        long maxTrackedKeys,   // memory bound: how many keys (emails) each limiter remembers at most
        Limit login,           // failed sign-ins per email before a temporary lock
        Limit passwordReset    // reset emails per address
) {

    public record Limit(int maxAttempts, Duration window) {
    }
}
