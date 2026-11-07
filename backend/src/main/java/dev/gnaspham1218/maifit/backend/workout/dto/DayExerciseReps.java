package dev.gnaspham1218.maifit.backend.workout.dto;

import dev.gnaspham1218.maifit.backend.workout.entity.WorkoutExercise;

import java.time.LocalDate;

// Total reps of one exercise on one day (Vietnam time)
public record DayExerciseReps(LocalDate date, WorkoutExercise exercise, long reps) {
}
