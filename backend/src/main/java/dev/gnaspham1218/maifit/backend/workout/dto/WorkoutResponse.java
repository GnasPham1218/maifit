package dev.gnaspham1218.maifit.backend.workout.dto;

import dev.gnaspham1218.maifit.backend.workout.entity.WorkoutExercise;

import java.time.Instant;

public record WorkoutResponse(
        Long id,
        WorkoutExercise exercise,
        int reps,
        Instant startedAt,
        int durationSec
) {
}
