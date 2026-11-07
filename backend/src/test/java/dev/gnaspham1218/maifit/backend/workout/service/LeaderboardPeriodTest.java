package dev.gnaspham1218.maifit.backend.workout.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class LeaderboardPeriodTest {

    // Saturday 7 November 2026
    private static final LocalDate SATURDAY = LocalDate.of(2026, 11, 7);

    @Test
    void dayIsThatDayOnly() {
        assertThat(LeaderboardPeriod.DAY.rangeContaining(SATURDAY))
                .isEqualTo(new LeaderboardPeriod.Range(SATURDAY, SATURDAY.plusDays(1)));
    }

    @Test
    void weekStartsOnMonday() {
        assertThat(LeaderboardPeriod.WEEK.rangeContaining(SATURDAY))
                .isEqualTo(new LeaderboardPeriod.Range(LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 9)));
    }

    @Test
    void mondayIsTheFirstDayOfItsOwnWeek() {
        LocalDate monday = LocalDate.of(2026, 11, 2);
        assertThat(LeaderboardPeriod.WEEK.rangeContaining(monday).start()).isEqualTo(monday);
    }

    @Test
    void monthIsTheCalendarMonth() {
        assertThat(LeaderboardPeriod.MONTH.rangeContaining(SATURDAY))
                .isEqualTo(new LeaderboardPeriod.Range(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1)));
    }
}
