package dev.gnaspham1218.maifit.backend.auth.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import dev.gnaspham1218.maifit.backend.config.RateLimitProperties;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;

// Per-email limits for the auth endpoints (per-IP limits live in Nginx).
//
// Two libraries, two jobs:
//  - Bucket4j does the COUNTING: each email gets a token bucket (e.g. 5 tokens, all refilled every 15 min).
//  - Caffeine does the STORING: email -> bucket, with a size bound and expiry, so an attacker sending
//    millions of random emails cannot make the backend run out of memory (a plain HashMap would).
//
// Keys are counted even for emails that have no account: otherwise "locked" vs "not locked"
// would reveal which emails are registered.
@Component
public class AuthRateLimiter {

    private final RateLimitProperties.Limit loginLimit;
    private final RateLimitProperties.Limit passwordResetLimit;

    private final Cache<String, Bucket> loginBuckets;          // email -> failed sign-in attempts left
    private final Cache<String, Bucket> passwordResetBuckets;  // email -> reset emails left

    public AuthRateLimiter(RateLimitProperties properties) {
        this.loginLimit = properties.login();
        this.passwordResetLimit = properties.passwordReset();
        this.loginBuckets = newCache(loginLimit.window(), properties.maxTrackedKeys());
        this.passwordResetBuckets = newCache(passwordResetLimit.window(), properties.maxTrackedKeys());
    }

    // ---- Sign-in ----

    // Only looks, never takes a token. getIfPresent: no bucket is created for users who never failed.
    public boolean isLoginLocked(String email) {
        Bucket bucket = loginBuckets.getIfPresent(email);
        return bucket != null && bucket.getAvailableTokens() == 0;
    }

    // One wrong password = one token taken
    public void recordLoginFailure(String email) {
        loginBuckets.get(email, key -> newBucket(loginLimit)).tryConsume(1);
    }

    // Correct password: forget the failures
    public void resetLoginFailures(String email) {
        loginBuckets.invalidate(email);
    }

    // ---- Password reset emails ----

    // True = a reset email may be sent now (one token taken); false = limit reached
    public boolean tryAcquirePasswordResetEmail(String email) {
        return passwordResetBuckets.get(email, key -> newBucket(passwordResetLimit)).tryConsume(1);
    }

    // ---- Helpers ----

    // e.g. capacity 5, and all 5 tokens come back every 15 minutes (counted from when the bucket was created)
    private static Bucket newBucket(RateLimitProperties.Limit limit) {
        return Bucket.builder()
                .addLimit(l -> l.capacity(limit.maxAttempts())
                        .refillIntervally(limit.maxAttempts(), limit.window()))
                .build();
    }

    // expireAfterAccess(window): a bucket untouched for a whole window would be full again anyway,
    // so dropping it changes nothing and frees memory
    private static Cache<String, Bucket> newCache(Duration window, long maxKeys) {
        return Caffeine.newBuilder()
                .expireAfterAccess(window)
                .maximumSize(maxKeys)
                .build();
    }
}
