package dev.gnaspham1218.maifit.backend.workout.service;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

// Streak = consecutive calendar days with at least one session, ending today, or yesterday when
// nothing was done yet today (the streak is not "lost" before the day is over). Pure: unit tested.
public final class StreakCalculator {

    private StreakCalculator() {
    }

    public static int streak(Collection<LocalDate> activeDays, LocalDate today) {
        Set<LocalDate> days = new HashSet<>(activeDays);
        LocalDate day = days.contains(today) ? today : today.minusDays(1);
        int count = 0;
        while (days.contains(day)) {
            count++;
            day = day.minusDays(1);
        }
        return count;
    }
}
