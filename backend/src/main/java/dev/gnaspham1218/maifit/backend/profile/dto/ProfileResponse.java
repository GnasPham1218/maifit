package dev.gnaspham1218.maifit.backend.profile.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ProfileResponse(
        String sex,
        LocalDate birthDate,
        BigDecimal heightCm,
        String activityLevel,
        String goal,
        Integer customTargetKcal,
        int age,
        BigDecimal latestWeightKg, // null until the first check-in
        BigDecimal latestBodyFatPct, // body fat % of that same check-in, null if not measured
        EnergyTargets energy,      // null until the first check-in (TDEE needs a weight)

        // ---- Personal coach ----
        String trainingExperience,             // null = not answered
        String trainingType,
        String dietType,
        String suggestionStyle,
        BigDecimal targetWeightKg,
        List<String> allergens,                // allergen group codes, display order of the allergens table
        List<ExcludedFoodResponse> excludedFoods,
        boolean coachComplete                  // false -> the app asks the user to complete the profile
) {
}
