package dev.gnaspham1218.maifit.backend.common.email;

import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import dev.gnaspham1218.maifit.backend.config.AppMailProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;

// Global cap on emails sent by the whole app per day (Vietnam time), to protect the Gmail account.
//
// The per-email limits (AuthRateLimiter) cannot stop an attack spread over many DIFFERENT addresses
// (e.g. bots registering 1,000 random emails: one verification mail each). Gmail blocks or even
// suspends an account that sends too much, and then real users get no emails at all.
// Stopping ourselves below Gmail's limit is the lesser evil.
//
// In memory: a restart resets the count (acceptable with one backend instance).
@Component
public class EmailDailyQuota {

    private final int dailyLimit;
    private final Clock clock;

    // Guarded by "synchronized": only a few emails per minute, so a simple lock is plenty
    private LocalDate day;
    private int sentToday;

    @Autowired
    public EmailDailyQuota(AppMailProperties properties) {
        this(properties.dailyLimit(), Clock.system(AppTime.ZONE));
    }

    // Used by tests with a fixed clock
    EmailDailyQuota(int dailyLimit, Clock clock) {
        this.dailyLimit = dailyLimit;
        this.clock = clock;
    }

    // True = this email may be sent (and is counted); false = today's cap is reached
    public synchronized boolean tryAcquire() {
        LocalDate today = LocalDate.now(clock); // the clock's zone is Vietnam time
        if (!today.equals(day)) {               // first email of a new day: start counting again
            day = today;
            sentToday = 0;
        }
        if (sentToday >= dailyLimit) {
            return false;
        }
        sentToday++;
        return true;
    }
}
