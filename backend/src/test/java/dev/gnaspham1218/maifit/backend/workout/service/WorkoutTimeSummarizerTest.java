package dev.gnaspham1218.maifit.backend.workout.service;

import dev.gnaspham1218.maifit.backend.workout.dto.WorkoutTimeSummary;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WorkoutTimeSummarizerTest {

    // Saturday 14 November 2026: the week started on Monday the 9th
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 14);

    private static WorkoutTimeSummarizer.Day day(long seconds, int sets) {
        return new WorkoutTimeSummarizer.Day(seconds, sets);
    }

    @Test
    void totalsCountTodayThisWeekAndThisMonth() {
        WorkoutTimeSummary s = WorkoutTimeSummarizer.summarize(Map.of(
                TODAY, day(600, 3),
                LocalDate.of(2026, 11, 10), day(300, 1),   // same week
                LocalDate.of(2026, 11, 5), day(900, 2),    // last week, same month
                LocalDate.of(2026, 10, 31), day(1200, 4)), // last month
                TODAY);

        assertThat(s.today()).isEqualTo(new WorkoutTimeSummary.Total(600, 3, 1));
        assertThat(s.thisWeek()).isEqualTo(new WorkoutTimeSummary.Total(900, 4, 2));
        assertThat(s.thisMonth()).isEqualTo(new WorkoutTimeSummary.Total(1800, 6, 3));
    }

    @Test
    void barsEndWithTheCurrentPeriodAndStartOnTheRightDay() {
        WorkoutTimeSummary s = WorkoutTimeSummarizer.summarize(Map.of(TODAY, day(600, 3)), TODAY);

        assertThat(s.days()).hasSize(7);
        assertThat(s.days().getLast()).isEqualTo(new WorkoutTimeSummary.Bucket(TODAY, 600));
        assertThat(s.days().getFirst().start()).isEqualTo(LocalDate.of(2026, 11, 8));
        assertThat(s.weeks()).hasSize(6);
        assertThat(s.weeks().getLast().start()).isEqualTo(LocalDate.of(2026, 11, 9));   // Monday
        assertThat(s.weeks().getFirst().start()).isEqualTo(LocalDate.of(2026, 10, 5));
        assertThat(s.months()).hasSize(6);
        assertThat(s.months().getLast()).isEqualTo(new WorkoutTimeSummary.Bucket(LocalDate.of(2026, 11, 1), 600));
        assertThat(s.months().getFirst().start()).isEqualTo(LocalDate.of(2026, 6, 1));
    }

    @Test
    void theQueryStartsAtTheOldestDayAnyBarNeeds() {
        assertThat(WorkoutTimeSummarizer.firstDay(TODAY)).isEqualTo(LocalDate.of(2026, 6, 1));
    }

    @Test
    void noWorkoutGivesZerosNotGaps() {
        WorkoutTimeSummary s = WorkoutTimeSummarizer.summarize(Map.of(), TODAY);
        assertThat(s.thisMonth()).isEqualTo(new WorkoutTimeSummary.Total(0, 0, 0));
        assertThat(s.weeks()).allSatisfy(b -> assertThat(b.seconds()).isZero());
    }
}
