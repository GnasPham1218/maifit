package dev.gnaspham1218.maifit.backend.workout.repository;

import dev.gnaspham1218.maifit.backend.workout.entity.WorkoutExercise;
import dev.gnaspham1218.maifit.backend.workout.entity.WorkoutSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long> {

    // Ownership check built into the query: another user's set simply is "not found" (IDOR)
    Optional<WorkoutSession> findByIdAndUserId(Long id, Long userId);

    // Reps per calendar day (Vietnam time) and exercise, for the history calendar, in ONE query.
    // Columns: [0] day (date), [1] exercise, [2] reps (bigint)
    @Query(value = """
            select cast(w.started_at at time zone :zone as date) as day, w.exercise, sum(w.reps) as reps
            from workout_sessions w
            where w.user_id = :userId and w.started_at >= :from and w.started_at < :to
            group by day, w.exercise
            order by day, w.exercise
            """, nativeQuery = true)
    List<Object[]> sumRepsPerDay(@Param("userId") Long userId,
                                 @Param("from") Instant from,
                                 @Param("to") Instant to,
                                 @Param("zone") String zone);

    // Training time per calendar day (Vietnam time), for the profile's time card, in ONE query.
    // Columns: [0] day (date), [1] seconds (bigint), [2] sets (bigint)
    @Query(value = """
            select cast(w.started_at at time zone :zone as date) as day, sum(w.duration_sec) as seconds, count(*) as sets
            from workout_sessions w
            where w.user_id = :userId and w.started_at >= :from and w.started_at < :to
            group by day
            order by day
            """, nativeQuery = true)
    List<Object[]> sumTimePerDay(@Param("userId") Long userId,
                                 @Param("from") Instant from,
                                 @Param("to") Instant to,
                                 @Param("zone") String zone);

    // A retry of a set already saved (same client_id) returns that set instead of a duplicate
    Optional<WorkoutSession> findByUserIdAndClientId(Long userId, UUID clientId);

    // Sessions of one user in [from, to): daily limit (uses index (user_id, started_at))
    long countByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThan(Long userId, Instant from, Instant to);

    List<WorkoutSession> findByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThanOrderByStartedAt(
            Long userId, Instant from, Instant to);

    @Query("""
            select coalesce(sum(w.reps), 0) from WorkoutSession w
            where w.userId = :userId and w.exercise = :exercise
              and w.startedAt >= :from and w.startedAt < :to
            """)
    long sumReps(@Param("userId") Long userId,
                 @Param("exercise") WorkoutExercise exercise,
                 @Param("from") Instant from,
                 @Param("to") Instant to);

    // Leaderboard in ONE query: total reps per user for one exercise in [from, to), ranked with
    // RANK() (equal totals share a rank). Returns the top `top` ranks plus the caller's own row,
    // so "your rank" is known even outside the top. Only display_name leaves the database.
    // Columns: [0] rank (bigint), [1] user_id (bigint), [2] display_name, [3] reps (bigint)
    @Query(value = """
            with totals as (
                select w.user_id, sum(w.reps) as reps
                from workout_sessions w
                where w.exercise = :exercise and w.started_at >= :from and w.started_at < :to
                group by w.user_id
            ), ranked as (
                select t.user_id, t.reps, rank() over (order by t.reps desc) as rnk
                from totals t
            )
            select r.rnk, r.user_id, u.display_name, r.reps
            from ranked r
            join users u on u.id = r.user_id
            where r.rnk <= :top or r.user_id = :userId
            order by r.rnk, u.display_name, r.user_id
            """, nativeQuery = true)
    List<Object[]> leaderboard(@Param("exercise") String exercise,
                               @Param("from") Instant from,
                               @Param("to") Instant to,
                               @Param("top") int top,
                               @Param("userId") Long userId);

    // Calendar days (Vietnam time) with at least one session since `from`, newest first (streak)
    @Query(value = """
            select distinct cast(w.started_at at time zone :zone as date) as day
            from workout_sessions w
            where w.user_id = :userId and w.started_at >= :from
            order by day desc
            """, nativeQuery = true)
    List<Object> activeDays(@Param("userId") Long userId,
                            @Param("from") Instant from,
                            @Param("zone") String zone);
}
