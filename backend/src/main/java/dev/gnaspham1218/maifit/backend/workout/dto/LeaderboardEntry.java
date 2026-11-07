package dev.gnaspham1218.maifit.backend.workout.dto;

// Only the display name is public: no email, no user id
public record LeaderboardEntry(
        int rank, // equal totals share a rank (1, 2, 2, 4)
        String displayName,
        long reps,
        boolean me
) {
}
