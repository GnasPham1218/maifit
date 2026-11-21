package dev.gnaspham1218.maifit.backend.profile.service;

import dev.gnaspham1218.maifit.backend.profile.dto.EnergyTargets;
import dev.gnaspham1218.maifit.backend.profile.dto.Macros;
import dev.gnaspham1218.maifit.backend.profile.entity.ActivityLevel;
import dev.gnaspham1218.maifit.backend.profile.entity.Goal;
import dev.gnaspham1218.maifit.backend.profile.entity.Sex;
import dev.gnaspham1218.maifit.backend.profile.entity.TrainingExperience;
import dev.gnaspham1218.maifit.backend.profile.entity.TrainingType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

// Plain unit test: expected values computed by hand (comments show the math)
class TdeeCalculatorTest {

    // Same person in most tests: male, 21 y, 65 kg, 180 cm, 12% fat, light exercise -> TDEE 2207.6
    private static EnergyTargets reference(Goal goal, TrainingExperience experience, TrainingType type) {
        return TdeeCalculator.calculate(Sex.MALE, 65, 180, 12.0, 21, ActivityLevel.LIGHT, goal, experience, type, null);
    }

    @Test
    void adultWithBodyFatMatchesTdeeCalculatorNet() {
        // LBM = 65 * 0.88 = 57.2 ; BMR = 370 + 21.6 * 57.2 = 1605.5 ; TDEE = 1605.5 * 1.375 = 2207.6
        EnergyTargets e = reference(Goal.MAINTAIN, null, null);

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
    void fatLossAndWeightGainAreMinusAndPlus500() {
        assertThat(reference(Goal.FAT_LOSS, null, null).suggestedKcal()).isEqualTo(1708);
        assertThat(reference(Goal.WEIGHT_GAIN, null, null).suggestedKcal()).isEqualTo(2708);
    }

    @Test
    void recompAndEnduranceStayAtMaintenance() {
        assertThat(reference(Goal.RECOMP, null, null).suggestedKcal()).isEqualTo(2208);
        assertThat(reference(Goal.ENDURANCE, null, null).suggestedKcal()).isEqualTo(2208);
    }

    @Test
    void leanBulkSurplusDependsOnExperience() {
        // Beginners and < 1 year: +15% -> 2207.6 + 331 = 2538.6 ; trained or not answered: +10% -> 2207.6 + 221
        assertThat(reference(Goal.LEAN_BULK, TrainingExperience.BEGINNER, null).suggestedKcal()).isEqualTo(2539);
        assertThat(reference(Goal.LEAN_BULK, TrainingExperience.UNDER_1_YEAR, null).suggestedKcal()).isEqualTo(2539);
        assertThat(reference(Goal.LEAN_BULK, TrainingExperience.OVER_1_YEAR, null).suggestedKcal()).isEqualTo(2429);
        assertThat(reference(Goal.LEAN_BULK, null, null).suggestedKcal()).isEqualTo(2429);
    }

    @Test
    void proteinTargetUsesTheGoalRatePerKg() {
        EnergyTargets maintain = reference(Goal.MAINTAIN, null, null);  // 65 * 1.6 = 104
        EnergyTargets bulk = reference(Goal.LEAN_BULK, null, null);     // 65 * 2.0 = 130

        assertThat(maintain.proteinTargetG()).isEqualTo(104);
        assertThat(maintain.proteinBasis()).isEqualTo("BODY_WEIGHT");
        assertThat(bulk.proteinTargetG()).isEqualTo(130);
    }

    @Test
    void fatLossUsesLeanMassWhenBodyFatIsKnown() {
        // With 12% fat: 57.2 kg lean mass * 2.3 = 131.6 ; without body fat: 65 * 2.2 = 143
        EnergyTargets withFat = reference(Goal.FAT_LOSS, null, TrainingType.STRENGTH);
        EnergyTargets withoutFat = TdeeCalculator.calculate(Sex.MALE, 65, 180, null, 21,
                ActivityLevel.LIGHT, Goal.FAT_LOSS, null, TrainingType.STRENGTH, null);

        assertThat(withFat.proteinTargetG()).isEqualTo(132);
        assertThat(withFat.proteinBasis()).isEqualTo("LEAN_MASS");
        assertThat(withoutFat.proteinTargetG()).isEqualTo(143);
        assertThat(withoutFat.proteinBasis()).isEqualTo("BODY_WEIGHT");
    }

    @Test
    void lightTrainingCapsProteinAt1_2PerKg() {
        // RECOMP would be 2.0 g/kg; light training -> 65 * 1.2 = 78
        EnergyTargets e = reference(Goal.RECOMP, null, TrainingType.LIGHT);

        assertThat(e.proteinTargetG()).isEqualTo(78);
        assertThat(e.proteinPerKg()).isEqualTo(1.2);
    }

    @Test
    void enduranceRecommendsTheHigherCarbSplit() {
        assertThat(reference(Goal.ENDURANCE, null, TrainingType.CARDIO).recommendedSplit()).isEqualTo("HIGHER_CARB");
        assertThat(reference(Goal.FAT_LOSS, null, null).recommendedSplit()).isEqualTo("MODERATE_CARB");
    }

    @Test
    void adultWithoutBodyFatUsesMifflinStJeor() {
        // BMR = 10*65 + 6.25*180 - 5*21 + 5 = 1675 ; TDEE = 1675 * 1.375 = 2303.1
        EnergyTargets e = TdeeCalculator.calculate(Sex.MALE, 65, 180, null, 21,
                ActivityLevel.LIGHT, Goal.MAINTAIN, null, null, null);

        assertThat(e.formula()).isEqualTo("MIFFLIN_ST_JEOR");
        assertThat(e.bmr()).isEqualTo(1675);
        assertThat(e.tdee()).isEqualTo(2303);
    }

    @Test
    void teenUsesSchofieldAndGetsNoDeficit() {
        // BMR = 17.686*60 + 658.2 = 1719.4 ; TDEE = 1719.4 * 1.55 = 2665.0 ; FAT_LOSS -> maintenance
        EnergyTargets e = TdeeCalculator.calculate(Sex.MALE, 60, 170, 15.0, 16,
                ActivityLevel.MODERATE, Goal.FAT_LOSS, null, null, null);

        assertThat(e.formula()).isEqualTo("SCHOFIELD"); // body fat ignored for teens
        assertThat(e.bmr()).isEqualTo(1719);
        assertThat(e.tdee()).isEqualTo(2665);
        assertThat(e.suggestedKcal()).isEqualTo(2665);
        assertThat(e.deficitSkippedForMinor()).isTrue();
        assertThat(e.proteinBasis()).isEqualTo("BODY_WEIGHT"); // body fat ignored for the protein too: 60 * 2.2
        assertThat(e.proteinTargetG()).isEqualTo(132);
    }

    @Test
    void femaleFatLossIsClampedToSafeMinimum() {
        // Mifflin: 550 + 1000 - 150 - 161 = 1239 ; TDEE = 1486.8 ; 1486.8 - 500 = 987 -> below 1200
        EnergyTargets e = TdeeCalculator.calculate(Sex.FEMALE, 55, 160, null, 30,
                ActivityLevel.SEDENTARY, Goal.FAT_LOSS, null, null, null);

        assertThat(e.suggestedKcal()).isEqualTo(TdeeCalculator.MIN_KCAL_FEMALE);
    }

    @Test
    void customTargetOverridesSuggestion() {
        EnergyTargets e = TdeeCalculator.calculate(Sex.MALE, 65, 180, 12.0, 21,
                ActivityLevel.LIGHT, Goal.MAINTAIN, null, null, 2000);

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
