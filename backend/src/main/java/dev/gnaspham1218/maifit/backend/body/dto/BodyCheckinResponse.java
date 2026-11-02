package dev.gnaspham1218.maifit.backend.body.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record BodyCheckinResponse(
        Long id,
        Instant checkedAt,
        BigDecimal weightKg,
        BigDecimal bodyFatPct,
        BigDecimal waistCm,
        String note
) {
}
