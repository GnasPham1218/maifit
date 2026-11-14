package dev.gnaspham1218.maifit.backend.workout.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Training time (sum of the saved sets' durations) for the profile card, Vietnam time.
 *
 * @param today     this day
 * @param thisWeek  Monday to today (same week as the leaderboard)
 * @param thisMonth the 1st to today
 * @param days      the last 7 days, oldest first (today last)
 * @param weeks     the last 6 weeks, oldest first (this week last)
 * @param months    the last 6 months, oldest first (this month last)
 */
public record WorkoutTimeSummary(Total today, Total thisWeek, Total thisMonth,
                                 List<Bucket> days, List<Bucket> weeks, List<Bucket> months) {

    /** seconds trained, sets saved, days with at least one set */
    public record Total(long seconds, int sets, int days) {
    }

    /** One bar of the chart: the first day of the day / week / month and its seconds */
    public record Bucket(LocalDate start, long seconds) {
    }
}
