package dev.gnaspham1218.maifit.backend.workout.dto;

import java.time.LocalDate;
import java.util.List;

public record DailyWorkoutsResponse(
        LocalDate date, // Vietnam time
        List<WorkoutResponse> sessions,
        int streakDays // consecutive days with a session, ending today (or yesterday)
) {
}
