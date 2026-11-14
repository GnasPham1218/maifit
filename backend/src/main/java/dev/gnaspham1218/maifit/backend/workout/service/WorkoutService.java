package dev.gnaspham1218.maifit.backend.workout.service;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import dev.gnaspham1218.maifit.backend.workout.dto.CreateWorkoutRequest;
import dev.gnaspham1218.maifit.backend.workout.dto.DailyWorkoutsResponse;
import dev.gnaspham1218.maifit.backend.workout.dto.DayExerciseReps;
import dev.gnaspham1218.maifit.backend.workout.dto.MonthlyWorkoutSummary;
import dev.gnaspham1218.maifit.backend.workout.dto.WorkoutResponse;
import dev.gnaspham1218.maifit.backend.workout.dto.WorkoutTimeSummary;
import dev.gnaspham1218.maifit.backend.workout.entity.WorkoutExercise;
import dev.gnaspham1218.maifit.backend.workout.entity.WorkoutSession;
import dev.gnaspham1218.maifit.backend.workout.repository.WorkoutSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Reps are counted in the browser, which the user controls (DevTools, a video in front of the
// camera...). The server cannot see the movement, so it rejects what is impossible or abusive:
// a pace no human reaches, a time outside the last 24 h, too many sessions or reps per day.
@Service
@RequiredArgsConstructor
public class WorkoutService {

    static final int MAX_SESSIONS_PER_DAY = 20;
    static final int MAX_REPS_PER_EXERCISE_PER_DAY = 2000;
    // Small tolerance for a phone clock that runs a bit fast
    private static final Duration FUTURE_TOLERANCE = Duration.ofMinutes(5);
    // Sets are saved right after the workout: older ones are not accepted (no back-filling)
    private static final Duration MAX_AGE = Duration.ofHours(24);
    // Streak looks back this far at most (a longer streak simply shows as 400)
    private static final int STREAK_LOOKBACK_DAYS = 400;

    private final WorkoutSessionRepository repository;

    // Max 3.5 reps per second, same rule as the DB CHECK (reps * 2 <= duration * 7).
    // The browser already drops two reps closer than 0.3 s (~3.3 reps/s).
    static boolean paceIsPossible(int reps, int durationSec) {
        return reps * 2L <= durationSec * 7L;
    }

    @Transactional
    public WorkoutResponse create(Long userId, CreateWorkoutRequest req) {
        // The same set sent again (network retry): return what was saved, do not count it twice.
        // Two copies arriving at the very same moment hit the UNIQUE constraint and one fails;
        // the other is saved, so the set is still counted once.
        var existing = repository.findByUserIdAndClientId(userId, req.clientId());
        if (existing.isPresent()) return toResponse(existing.get());

        Instant now = Instant.now();
        Instant end = req.startedAt().plusSeconds(req.durationSec());
        if (req.startedAt().isBefore(now.minus(MAX_AGE)) || end.isAfter(now.plus(FUTURE_TOLERANCE))) {
            throw new AppException(ErrorCode.WORKOUT_TIME_INVALID);
        }
        if (!paceIsPossible(req.reps(), req.durationSec())) {
            throw new AppException(ErrorCode.WORKOUT_PACE_INVALID);
        }

        // Limits per calendar day (Vietnam time) of the set's start.
        // Soft limits: two requests at the exact same moment could both pass; harmless here.
        LocalDate day = LocalDate.ofInstant(req.startedAt(), AppTime.ZONE);
        Instant from = day.atStartOfDay(AppTime.ZONE).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(AppTime.ZONE).toInstant();
        if (repository.countByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThan(userId, from, to)
                >= MAX_SESSIONS_PER_DAY) {
            throw new AppException(ErrorCode.WORKOUT_DAILY_LIMIT);
        }
        if (repository.sumReps(userId, req.exercise(), from, to) + req.reps() > MAX_REPS_PER_EXERCISE_PER_DAY) {
            throw new AppException(ErrorCode.WORKOUT_REPS_DAILY_LIMIT);
        }

        WorkoutSession saved = repository.save(new WorkoutSession(
                userId, req.exercise(), req.reps(), req.startedAt(), req.durationSec(), req.clientId()));
        return toResponse(saved);
    }

    // date = calendar day in Vietnam time, default today
    @Transactional(readOnly = true)
    public DailyWorkoutsResponse listDay(Long userId, LocalDate date) {
        LocalDate day = date != null ? date : LocalDate.now(AppTime.ZONE);
        Instant from = day.atStartOfDay(AppTime.ZONE).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(AppTime.ZONE).toInstant();
        List<WorkoutResponse> sessions = repository
                .findByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThanOrderByStartedAt(userId, from, to)
                .stream().map(WorkoutService::toResponse).toList();
        return new DailyWorkoutsResponse(day, sessions, streak(userId));
    }

    // month = calendar month in Vietnam time, default this month
    @Transactional(readOnly = true)
    public MonthlyWorkoutSummary monthlySummary(Long userId, YearMonth month) {
        YearMonth m = month != null ? month : YearMonth.now(AppTime.ZONE);
        Instant from = m.atDay(1).atStartOfDay(AppTime.ZONE).toInstant();
        Instant to = m.plusMonths(1).atDay(1).atStartOfDay(AppTime.ZONE).toInstant(); // exclusive
        List<DayExerciseReps> days = repository.sumRepsPerDay(userId, from, to, AppTime.ZONE.getId()).stream()
                .map(row -> new DayExerciseReps(
                        toLocalDate(row[0]),
                        WorkoutExercise.valueOf((String) row[1]),
                        ((Number) row[2]).longValue()))
                .toList();
        return new MonthlyWorkoutSummary(m.toString(), days);
    }

    // Training time today / this week / this month and the bars of the last days, weeks and months
    @Transactional(readOnly = true)
    public WorkoutTimeSummary timeSummary(Long userId) {
        LocalDate today = LocalDate.now(AppTime.ZONE);
        Instant from = WorkoutTimeSummarizer.firstDay(today).atStartOfDay(AppTime.ZONE).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(AppTime.ZONE).toInstant(); // exclusive
        Map<LocalDate, WorkoutTimeSummarizer.Day> byDay = new HashMap<>();
        for (Object[] row : repository.sumTimePerDay(userId, from, to, AppTime.ZONE.getId())) {
            byDay.put(toLocalDate(row[0]),
                    new WorkoutTimeSummarizer.Day(((Number) row[1]).longValue(), ((Number) row[2]).intValue()));
        }
        return WorkoutTimeSummarizer.summarize(byDay, today);
    }

    // Only the owner can delete: someone else's id answers 404 (not 403), so ids cannot be probed.
    // Deleting only lowers totals, so it opens no way to climb the leaderboard.
    @Transactional
    public void delete(Long userId, Long id) {
        WorkoutSession session = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND));
        repository.delete(session);
    }

    @Transactional(readOnly = true)
    public int streak(Long userId) {
        LocalDate today = LocalDate.now(AppTime.ZONE);
        Instant since = today.minusDays(STREAK_LOOKBACK_DAYS).atStartOfDay(AppTime.ZONE).toInstant();
        List<LocalDate> days = repository.activeDays(userId, since, AppTime.ZONE.getId()).stream()
                .map(WorkoutService::toLocalDate)
                .toList();
        return StreakCalculator.streak(days, today);
    }

    static WorkoutResponse toResponse(WorkoutSession s) {
        return new WorkoutResponse(s.getId(), s.getExercise(), s.getReps(), s.getStartedAt(), s.getDurationSec());
    }

    // The JDBC driver may return a DATE column as java.sql.Date or LocalDate depending on the version
    private static LocalDate toLocalDate(Object value) {
        return value instanceof Date d ? d.toLocalDate() : (LocalDate) value;
    }
}
