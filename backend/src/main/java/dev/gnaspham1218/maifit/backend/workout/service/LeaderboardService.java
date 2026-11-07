package dev.gnaspham1218.maifit.backend.workout.service;

import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import dev.gnaspham1218.maifit.backend.workout.dto.LeaderboardEntry;
import dev.gnaspham1218.maifit.backend.workout.dto.LeaderboardResponse;
import dev.gnaspham1218.maifit.backend.workout.entity.WorkoutExercise;
import dev.gnaspham1218.maifit.backend.workout.repository.WorkoutSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

// No leaderboard table: ranks are computed from workout_sessions on every request (one query).
// Fine for a small app; with many users this would become a cached / materialized result.
@Service
@RequiredArgsConstructor
public class LeaderboardService {

    static final int TOP = 20;

    private final WorkoutSessionRepository repository;
    private final WorkoutService workoutService;

    @Transactional(readOnly = true)
    public LeaderboardResponse get(Long userId, WorkoutExercise exercise, LeaderboardPeriod period) {
        LeaderboardPeriod.Range range = period.rangeContaining(LocalDate.now(AppTime.ZONE));
        List<Object[]> rows = repository.leaderboard(
                exercise.name(),
                range.start().atStartOfDay(AppTime.ZONE).toInstant(),
                range.endExclusive().atStartOfDay(AppTime.ZONE).toInstant(),
                TOP,
                userId);

        List<LeaderboardEntry> top = new ArrayList<>();
        LeaderboardEntry me = null;
        for (Object[] row : rows) {
            int rank = ((Number) row[0]).intValue();
            boolean isMe = userId.equals(((Number) row[1]).longValue());
            LeaderboardEntry entry = new LeaderboardEntry(rank, (String) row[2], ((Number) row[3]).longValue(), isMe);
            if (isMe) me = entry;
            // Ties at the last rank could return more than TOP rows: the list stays at TOP
            if (rank <= TOP && top.size() < TOP) top.add(entry);
        }
        return new LeaderboardResponse(exercise, period, range.start(), range.endExclusive().minusDays(1),
                top, me, workoutService.streak(userId));
    }
}
