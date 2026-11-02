package dev.gnaspham1218.maifit.backend.profile.service;

import dev.gnaspham1218.maifit.backend.profile.dto.EnergyTargets;
import dev.gnaspham1218.maifit.backend.profile.dto.Macros;
import dev.gnaspham1218.maifit.backend.profile.entity.ActivityLevel;
import dev.gnaspham1218.maifit.backend.profile.entity.Goal;
import dev.gnaspham1218.maifit.backend.profile.entity.Sex;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

// Plain unit test: expected values computed by hand (comments show the math)
class TdeeCalculatorTest {

    @Test
    void adultWithBodyFatMatchesTdeeCalculatorNet() {
        // Same input as tdeecalculator.net: male, 21 y, 65 kg, 180 cm, 12% fat, light exercise
        // LBM = 65 * 0.88 = 57.2 ; BMR = 370 + 21.6 * 57.2 = 1605.5 ; TDEE = 1605.5 * 1.375 = 2207.6
        EnergyTargets e = TdeeCalculator.calculate(Sex.MALE, 65, 180, 12.0, 21,
                ActivityLevel.LIGHT, Goal.MAINTAIN, null);

        assertThat(e.formula()).isEqualTo("KATCH_MCARDLE");
        assertThat(e.bmr()).isEqualTo(1606);
        assertThat(e.tdee()).isEqualTo(2208);
        assertThat(e.targetKcal()).isEqualTo(2208);
        // Same grams as the site's macro table for maintenance
        assertThat(e.macros()).containsExactly(
                new Macros("MODERATE_CARB", 166, 86, 193),
                new Macros("LOWER_CARB", 221, 98, 110),
                new Macros("HIGHER_CARB", 166, 49, 276));
    }

    @Test
    void cuttingAndBulkingAreMinusAndPlus500() {
        EnergyTargets cut = TdeeCalculator.calculate(Sex.MALE, 65, 180, 12.0, 21,
                ActivityLevel.LIGHT, Goal.LOSE, null);
        EnergyTargets bulk = TdeeCalculator.calculate(Sex.MALE, 65, 180, 12.0, 21,
                ActivityLevel.LIGHT, Goal.GAIN, null);

        assertThat(cut.suggestedKcal()).isEqualTo(1708);
        assertThat(bulk.suggestedKcal()).isEqualTo(2708);
    }

    @Test
    void adultWithoutBodyFatUsesMifflinStJeor() {
        // BMR = 10*65 + 6.25*180 - 5*21 + 5 = 1675 ; TDEE = 1675 * 1.375 = 2303.1
        EnergyTargets e = TdeeCalculator.calculate(Sex.MALE, 65, 180, null, 21,
                ActivityLevel.LIGHT, Goal.MAINTAIN, null);

        assertThat(e.formula()).isEqualTo("MIFFLIN_ST_JEOR");
        assertThat(e.bmr()).isEqualTo(1675);
        assertThat(e.tdee()).isEqualTo(2303);
    }

    @Test
    void teenUsesSchofieldAndGetsNoDeficit() {
        // BMR = 17.686*60 + 658.2 = 1719.4 ; TDEE = 1719.4 * 1.55 = 2665.0 ; LOSE -> maintenance
        EnergyTargets e = TdeeCalculator.calculate(Sex.MALE, 60, 170, 15.0, 16,
                ActivityLevel.MODERATE, Goal.LOSE, null);

        assertThat(e.formula()).isEqualTo("SCHOFIELD"); // body fat ignored for teens
        assertThat(e.bmr()).isEqualTo(1719);
        assertThat(e.tdee()).isEqualTo(2665);
        assertThat(e.suggestedKcal()).isEqualTo(2665);
        assertThat(e.deficitSkippedForMinor()).isTrue();
    }

    @Test
    void femaleLoseIsClampedToSafeMinimum() {
        // Mifflin: 550 + 1000 - 150 - 161 = 1239 ; TDEE = 1486.8 ; 1486.8 - 500 = 987 -> below 1200
        EnergyTargets e = TdeeCalculator.calculate(Sex.FEMALE, 55, 160, null, 30,
                ActivityLevel.SEDENTARY, Goal.LOSE, null);

        assertThat(e.suggestedKcal()).isEqualTo(TdeeCalculator.MIN_KCAL_FEMALE);
    }

    @Test
    void customTargetOverridesSuggestion() {
        EnergyTargets e = TdeeCalculator.calculate(Sex.MALE, 65, 180, 12.0, 21,
                ActivityLevel.LIGHT, Goal.MAINTAIN, 2000);

        assertThat(e.suggestedKcal()).isEqualTo(2208);
        assertThat(e.targetKcal()).isEqualTo(2000);
    }

    @Test
    void ageCountsOnlyCompletedYears() {
        LocalDate today = LocalDate.of(2026, 11, 2);
        assertThat(TdeeCalculator.ageOn(LocalDate.of(2000, 11, 3), today)).isEqualTo(25); // birthday tomorrow
        assertThat(TdeeCalculator.ageOn(LocalDate.of(2000, 11, 2), today)).isEqualTo(26); // birthday today
    }
}
