package dev.gnaspham1218.maifit.backend.workout.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

// Max 3.5 reps per second, same rule as the DB CHECK constraint
class WorkoutPaceTest {

    @Test
    void aFastButHumanSetIsAccepted() {
        assertThat(WorkoutService.paceIsPossible(60, 30)).isTrue(); // 2 reps/s
        assertThat(WorkoutService.paceIsPossible(35, 10)).isTrue(); // exactly 3.5 reps/s
    }

    @Test
    void anImpossiblePaceIsRejected() {
        assertThat(WorkoutService.paceIsPossible(36, 10)).isFalse();
        assertThat(WorkoutService.paceIsPossible(500, 10)).isFalse();
    }
}
