package dev.gnaspham1218.maifit.backend.workout.dto;

import dev.gnaspham1218.maifit.backend.workout.entity.WorkoutExercise;
import dev.gnaspham1218.maifit.backend.workout.service.LeaderboardPeriod;

import java.time.LocalDate;
import java.util.List;

public record LeaderboardResponse(
        WorkoutExercise exercise,
        LeaderboardPeriod period,
        LocalDate from, // first day of the window, Vietnam time
        LocalDate to, // last day of the window (inclusive)
        List<LeaderboardEntry> top,
        LeaderboardEntry me, // null when the caller has no session in the window
        int streakDays
) {
}
