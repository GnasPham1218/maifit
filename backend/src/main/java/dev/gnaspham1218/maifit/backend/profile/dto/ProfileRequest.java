package dev.gnaspham1218.maifit.backend.profile.dto;

import dev.gnaspham1218.maifit.backend.profile.entity.ActivityLevel;
import dev.gnaspham1218.maifit.backend.profile.entity.DietType;
import dev.gnaspham1218.maifit.backend.profile.entity.Goal;
import dev.gnaspham1218.maifit.backend.profile.entity.Sex;
import dev.gnaspham1218.maifit.backend.profile.entity.SuggestionStyle;
import dev.gnaspham1218.maifit.backend.profile.entity.TrainingExperience;
import dev.gnaspham1218.maifit.backend.profile.entity.TrainingType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

// Weight is NOT here: it is recorded as a body check-in (POST /body-checkins).
// PUT semantics: the request replaces the whole profile, a missing list means "none".
public record ProfileRequest(
        @NotNull Sex sex,
        @NotNull @Past LocalDate birthDate,
        @NotNull @DecimalMin("100.0") @DecimalMax("250.0") BigDecimal heightCm,
        @NotNull ActivityLevel activityLevel,
        @NotNull Goal goal,
        @Min(1000) @Max(6000) Integer customTargetKcal, // optional

        // ---- Personal coach: optional, fixed choices and numbers only (no free text) ----
        TrainingExperience trainingExperience,
        TrainingType trainingType,
        DietType dietType,
        SuggestionStyle suggestionStyle,                // null -> VARIETY
        @DecimalMin("20.0") @DecimalMax("400.0") BigDecimal targetWeightKg,
        // allergen group codes (GET /api/allergens); checked against the table by the service
        @Size(max = 20) Set<@NotNull @Pattern(regexp = "[A-Z_]{2,20}") String> allergens,
        // any row id of a food; stored as the RAW row of that food
        @Size(max = 50) Set<@NotNull Long> excludedFoodIds
) {
    public Set<String> allergensOrEmpty() {
        return allergens != null ? allergens : Set.of();
    }

    public Set<Long> excludedFoodIdsOrEmpty() {
        return excludedFoodIds != null ? excludedFoodIds : Set.of();
    }
}
