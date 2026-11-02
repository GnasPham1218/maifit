package dev.gnaspham1218.maifit.backend.profile.dto;

import dev.gnaspham1218.maifit.backend.profile.entity.ActivityLevel;
import dev.gnaspham1218.maifit.backend.profile.entity.Goal;
import dev.gnaspham1218.maifit.backend.profile.entity.Sex;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.math.BigDecimal;
import java.time.LocalDate;

// Weight is NOT here: it is recorded as a body check-in (POST /body-checkins)
public record ProfileRequest(
        @NotNull Sex sex,
        @NotNull @Past LocalDate birthDate,
        @NotNull @DecimalMin("100.0") @DecimalMax("250.0") BigDecimal heightCm,
        @NotNull ActivityLevel activityLevel,
        @NotNull Goal goal,
        @Min(1000) @Max(6000) Integer customTargetKcal // optional
) {
}
