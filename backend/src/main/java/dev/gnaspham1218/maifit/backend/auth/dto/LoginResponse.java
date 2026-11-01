package dev.gnaspham1218.maifit.backend.auth.dto;

import dev.gnaspham1218.maifit.backend.user.dto.UserResponse;

import java.time.Instant;

public record LoginResponse(
        String accessToken,
        Instant accessTokenExpiresAt, // the frontend refreshes shortly before this (step 6)
        UserResponse user
) {
}
