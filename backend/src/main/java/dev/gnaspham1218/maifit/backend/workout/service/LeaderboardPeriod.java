package dev.gnaspham1218.maifit.backend.workout.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

// Leaderboard windows as calendar dates in Vietnam time. end is exclusive.
public enum LeaderboardPeriod {
    DAY,
    WEEK, // Monday to Sunday
    MONTH;

    public record Range(LocalDate start, LocalDate endExclusive) {
    }

    public Range rangeContaining(LocalDate day) {
        return switch (this) {
            case DAY -> new Range(day, day.plusDays(1));
            case WEEK -> {
                LocalDate monday = day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                yield new Range(monday, monday.plusWeeks(1));
            }
            case MONTH -> {
                LocalDate first = day.withDayOfMonth(1);
                yield new Range(first, first.plusMonths(1));
            }
        };
    }
}
