package dev.gnaspham1218.maifit.backend.workout.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StreakCalculatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 7);

    @Test
    void noSessionsIsZero() {
        assertThat(StreakCalculator.streak(List.of(), TODAY)).isZero();
    }

    @Test
    void countsConsecutiveDaysEndingToday() {
        assertThat(StreakCalculator.streak(List.of(TODAY, TODAY.minusDays(1), TODAY.minusDays(2)), TODAY)).isEqualTo(3);
    }

    @Test
    void notTrainedYetTodayKeepsYesterdaysStreak() {
        assertThat(StreakCalculator.streak(List.of(TODAY.minusDays(1), TODAY.minusDays(2)), TODAY)).isEqualTo(2);
    }

    @Test
    void aMissedDayBreaksTheStreak() {
        // trained today and 2 days ago, not yesterday
        assertThat(StreakCalculator.streak(List.of(TODAY, TODAY.minusDays(2), TODAY.minusDays(3)), TODAY)).isEqualTo(1);
    }

    @Test
    void lastSessionTwoDaysAgoIsZero() {
        assertThat(StreakCalculator.streak(List.of(TODAY.minusDays(2)), TODAY)).isZero();
    }
}
