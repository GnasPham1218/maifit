package dev.gnaspham1218.maifit.backend.workout.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

// One set counted in the browser. Never edited: a set is saved once (client_id makes retries safe).
@Entity
@Table(name = "workout_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkoutSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private WorkoutExercise exercise;

    @Column(nullable = false, updatable = false)
    private int reps;

    @Column(nullable = false, updatable = false)
    private Instant startedAt;

    @Column(nullable = false, updatable = false)
    private int durationSec;

    @Column(nullable = false, updatable = false)
    private UUID clientId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public WorkoutSession(Long userId, WorkoutExercise exercise, int reps, Instant startedAt, int durationSec, UUID clientId) {
        this.userId = userId;
        this.exercise = exercise;
        this.reps = reps;
        this.startedAt = startedAt;
        this.durationSec = durationSec;
        this.clientId = clientId;
        this.createdAt = Instant.now();
    }
}
