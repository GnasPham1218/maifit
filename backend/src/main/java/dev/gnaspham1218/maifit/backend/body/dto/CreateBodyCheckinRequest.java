package dev.gnaspham1218.maifit.backend.body.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public record CreateBodyCheckinRequest(
        Instant checkedAt, // optional, defaults to now; ISO-8601, e.g. "2026-11-02T07:00:00Z"
        @NotNull @DecimalMin("20.0") @DecimalMax("400.0") BigDecimal weightKg,
        @DecimalMin("2.0") @DecimalMax("75.0") BigDecimal bodyFatPct,
        @DecimalMin("30.0") @DecimalMax("250.0") BigDecimal waistCm,
        @Size(max = 500) String note
) {
}
