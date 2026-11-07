package dev.gnaspham1218.maifit.backend.workout.dto;

import java.util.List;

// Only days with sets; a missing day means "no workout", not 0
public record MonthlyWorkoutSummary(String month, List<DayExerciseReps> days) {
}
