package dev.gnaspham1218.maifit.backend.common.email;

import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class EmailDailyQuotaTest {

    // A clock the test can move forward
    private static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void set(Instant instant) {
            this.now = instant;
        }

        @Override
        public ZoneId getZone() {
            return AppTime.ZONE;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @Test
    void allowsUpToTheLimitThenRefuses() {
        EmailDailyQuota quota = new EmailDailyQuota(3, new MutableClock(Instant.parse("2026-11-09T03:00:00Z")));

        assertThat(quota.tryAcquire()).isTrue();
        assertThat(quota.tryAcquire()).isTrue();
        assertThat(quota.tryAcquire()).isTrue();
        assertThat(quota.tryAcquire()).isFalse();
    }

    @Test
    void resetsAtMidnightVietnamTimeNotUtc() {
        // 16:59 UTC = 23:59 in Vietnam (UTC+7)
        MutableClock clock = new MutableClock(Instant.parse("2026-11-09T16:59:00Z"));
        EmailDailyQuota quota = new EmailDailyQuota(1, clock);
        assertThat(quota.tryAcquire()).isTrue();
        assertThat(quota.tryAcquire()).isFalse();

        // 17:00 UTC = 00:00 the next day in Vietnam: a new day, counting starts again
        clock.set(Instant.parse("2026-11-09T17:00:00Z"));
        assertThat(quota.tryAcquire()).isTrue();
    }

    @Test
    void sameDayInVietnamEvenWhenUtcDateDiffers() {
        // 00:30 in Vietnam on Nov 10 is still Nov 9 in UTC; both moments below are Nov 10 in Vietnam
        MutableClock clock = new MutableClock(Instant.parse("2026-11-09T17:30:00Z"));
        EmailDailyQuota quota = new EmailDailyQuota(1, clock);
        assertThat(quota.tryAcquire()).isTrue();

        clock.set(Instant.parse("2026-11-10T03:00:00Z"));
        assertThat(quota.tryAcquire()).isFalse();
    }

    @Test
    void zeroLimitSendsNothing() {
        EmailDailyQuota quota = new EmailDailyQuota(0, Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
        assertThat(quota.tryAcquire()).isFalse();
    }
}
