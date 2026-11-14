package dev.gnaspham1218.maifit.backend.workout.service;

import dev.gnaspham1218.maifit.backend.workout.dto.WorkoutTimeSummary;
import dev.gnaspham1218.maifit.backend.workout.dto.WorkoutTimeSummary.Bucket;
import dev.gnaspham1218.maifit.backend.workout.dto.WorkoutTimeSummary.Total;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Turns per-day totals into the profile's time card. Pure (no clock, no database): unit tested.
 * Weeks start on Monday, like the leaderboard.
 */
final class WorkoutTimeSummarizer {

    static final int DAYS = 7;
    static final int WEEKS = 6;
    static final int MONTHS = 6;

    /** What one calendar day holds */
    record Day(long seconds, int sets) {
    }

    private WorkoutTimeSummarizer() {
    }

    /** The first day the summary needs: the oldest of the 7 days, 6 weeks and 6 months */
    static LocalDate firstDay(LocalDate today) {
        LocalDate days = today.minusDays(DAYS - 1);
        LocalDate weeks = weekStart(today).minusWeeks(WEEKS - 1);
        LocalDate months = today.withDayOfMonth(1).minusMonths(MONTHS - 1);
        LocalDate first = days.isBefore(weeks) ? days : weeks;
        return first.isBefore(months) ? first : months;
    }

    static WorkoutTimeSummary summarize(Map<LocalDate, Day> byDay, LocalDate today) {
        LocalDate week = weekStart(today);
        LocalDate month = today.withDayOfMonth(1);

        List<Bucket> days = new ArrayList<>();
        for (int i = DAYS - 1; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            days.add(new Bucket(d, total(byDay, d, d).seconds()));
        }
        List<Bucket> weeks = new ArrayList<>();
        for (int i = WEEKS - 1; i >= 0; i--) {
            LocalDate start = week.minusWeeks(i);
            weeks.add(new Bucket(start, total(byDay, start, start.plusDays(6)).seconds()));
        }
        List<Bucket> months = new ArrayList<>();
        for (int i = MONTHS - 1; i >= 0; i--) {
            LocalDate start = month.minusMonths(i);
            months.add(new Bucket(start, total(byDay, start, start.with(TemporalAdjusters.lastDayOfMonth())).seconds()));
        }
        return new WorkoutTimeSummary(total(byDay, today, today), total(byDay, week, today), total(byDay, month, today),
                days, weeks, months);
    }

    static LocalDate weekStart(LocalDate day) {
        return day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    // Days in [from, to], both included
    private static Total total(Map<LocalDate, Day> byDay, LocalDate from, LocalDate to) {
        long seconds = 0;
        int sets = 0;
        int activeDays = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            Day day = byDay.get(d);
            if (day != null && day.sets() > 0) {
                seconds += day.seconds();
                sets += day.sets();
                activeDays++;
            }
        }
        return new Total(seconds, sets, activeDays);
    }
}
