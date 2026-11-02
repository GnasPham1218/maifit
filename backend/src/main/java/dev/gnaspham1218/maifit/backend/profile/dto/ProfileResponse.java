package dev.gnaspham1218.maifit.backend.profile.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProfileResponse(
        String sex,
        LocalDate birthDate,
        BigDecimal heightCm,
        String activityLevel,
        String goal,
        Integer customTargetKcal,
        int age,
        BigDecimal latestWeightKg, // null until the first check-in
        EnergyTargets energy       // null until the first check-in (TDEE needs a weight)
) {
}
