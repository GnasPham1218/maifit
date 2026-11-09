package dev.gnaspham1218.maifit.backend.auth.service;

import dev.gnaspham1218.maifit.backend.config.RateLimitProperties;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class AuthRateLimiterTest {

    private final AuthRateLimiter limiter = new AuthRateLimiter(new RateLimitProperties(
            1_000,
            new RateLimitProperties.Limit(5, Duration.ofMinutes(15)),
            new RateLimitProperties.Limit(3, Duration.ofHours(1))));

    @Test
    void notLockedBeforeAnyFailure() {
        assertThat(limiter.isLoginLocked("a@x.com")).isFalse();
    }

    @Test
    void lockedAfterFiveFailures() {
        for (int i = 0; i < 4; i++) {
            limiter.recordLoginFailure("a@x.com");
        }
        assertThat(limiter.isLoginLocked("a@x.com")).isFalse(); // 4 failures: still allowed

        limiter.recordLoginFailure("a@x.com");
        assertThat(limiter.isLoginLocked("a@x.com")).isTrue();  // 5th failure: locked
    }

    @Test
    void isLoginLockedDoesNotUseAnAttempt() {
        for (int i = 0; i < 10; i++) {
            limiter.isLoginLocked("a@x.com");
        }
        for (int i = 0; i < 4; i++) {
            limiter.recordLoginFailure("a@x.com");
        }
        assertThat(limiter.isLoginLocked("a@x.com")).isFalse();
    }

    @Test
    void emailsAreCountedSeparately() {
        for (int i = 0; i < 5; i++) {
            limiter.recordLoginFailure("a@x.com");
        }
        assertThat(limiter.isLoginLocked("b@x.com")).isFalse();
    }

    @Test
    void successfulLoginClearsFailures() {
        for (int i = 0; i < 5; i++) {
            limiter.recordLoginFailure("a@x.com");
        }
        limiter.resetLoginFailures("a@x.com");
        assertThat(limiter.isLoginLocked("a@x.com")).isFalse();
    }

    @Test
    void passwordResetEmailsAreLimited() {
        assertThat(limiter.tryAcquirePasswordResetEmail("a@x.com")).isTrue();
        assertThat(limiter.tryAcquirePasswordResetEmail("a@x.com")).isTrue();
        assertThat(limiter.tryAcquirePasswordResetEmail("a@x.com")).isTrue();
        assertThat(limiter.tryAcquirePasswordResetEmail("a@x.com")).isFalse();
        assertThat(limiter.tryAcquirePasswordResetEmail("b@x.com")).isTrue();
    }
}
