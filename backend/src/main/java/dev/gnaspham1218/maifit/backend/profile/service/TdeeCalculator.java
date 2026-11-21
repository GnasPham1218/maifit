package dev.gnaspham1218.maifit.backend.profile.service;

import dev.gnaspham1218.maifit.backend.profile.dto.EnergyTargets;
import dev.gnaspham1218.maifit.backend.profile.dto.Macros;
import dev.gnaspham1218.maifit.backend.profile.entity.ActivityLevel;
import dev.gnaspham1218.maifit.backend.profile.entity.Goal;
import dev.gnaspham1218.maifit.backend.profile.entity.Sex;
import dev.gnaspham1218.maifit.backend.profile.entity.TrainingExperience;
import dev.gnaspham1218.maifit.backend.profile.entity.TrainingType;

import java.time.LocalDate;
import java.time.Period;
import java.util.Arrays;
import java.util.List;

// Pure calculation: no Spring, no database -> easy to unit test.
// Energy follows tdeecalculator.net for adults (Katch-McArdle when body fat is known, otherwise
// Mifflin-St Jeor, TDEE = BMR x activity multiplier, 3 macro splits), plus an age rule for teenagers.
// Goal adjustments and protein targets (sources):
//   FAT_LOSS    -500 kcal (tdeecalculator.net; ~0.5-1% of body weight per week, Helms et al. 2014, JISSN)
//   RECOMP       maintenance (a 20% deficit lowers muscle protein synthesis: Pasiakos, in the ISSN
//                position stand on diets and body composition)
//   LEAN_BULK   +15% beginners / +10% trained (10-20% surplus, smaller for advanced trainees:
//                Iraki et al. 2019, Sports 7:154)
//   WEIGHT_GAIN +500 kcal (tdeecalculator.net)
//   MAINTAIN, ENDURANCE: maintenance
//   Protein per kg body weight: Goal.proteinPerKg (1.6-2.2 g/kg: Morton et al. 2018; ISSN 1.4-2.0 g/kg).
//   FAT_LOSS with a measured body fat %: 2.3 g/kg lean mass (2.3-3.1 g/kg FFM: Helms et al. 2014).
//   Training type LIGHT: capped at 1.2 g/kg (general fitness 0.8-1.2 g/kg: ISSN sports nutrition review).
public final class TdeeCalculator {

    static final int ADULT_AGE = 18;
    // Never suggest less than this (not on tdeecalculator.net: an extra safety floor for the app)
    static final int MIN_KCAL_MALE = 1500;
    static final int MIN_KCAL_FEMALE = 1200;

    static final int FAT_LOSS_DEFICIT = -500;
    static final int WEIGHT_GAIN_SURPLUS = 500;
    static final double LEAN_BULK_SURPLUS_BEGINNER = 0.15;
    static final double LEAN_BULK_SURPLUS_TRAINED = 0.10;  // also when experience is not answered (cautious)
    static final double PROTEIN_PER_KG_LEAN_MASS_FAT_LOSS = 2.3;
    static final double PROTEIN_PER_KG_LIGHT_TRAINING = 1.2;

    static final String BODY_WEIGHT = "BODY_WEIGHT";
    static final String LEAN_MASS = "LEAN_MASS";

    private TdeeCalculator() {
    }

    public static int ageOn(LocalDate birthDate, LocalDate today) {
        return Period.between(birthDate, today).getYears();
    }

    // Mifflin-St Jeor (1990): adults, needs height
    static double mifflinStJeor(Sex sex, double weightKg, double heightCm, int age) {
        double base = 10 * weightKg + 6.25 * heightCm - 5 * age;
        return sex == Sex.MALE ? base + 5 : base - 161;
    }

    // Katch-McArdle: based on lean body mass, same formula for both sexes
    static double katchMcArdle(double weightKg, double bodyFatPct) {
        double leanMassKg = weightKg * (1 - bodyFatPct / 100);
        return 370 + 21.6 * leanMassKg;
    }

    // Schofield (1985), age group 10–18, weight only
    static double schofieldTeen(Sex sex, double weightKg) {
        return sex == Sex.MALE ? 17.686 * weightKg + 658.2 : 13.384 * weightKg + 692.6;
    }

    /**
     * @param bodyFatPct body fat % from the latest check-in, or null if not measured
     * @param experience null = not answered (lean bulk then uses the cautious +10%)
     * @param trainingType null = not answered
     */
    public static EnergyTargets calculate(Sex sex, double weightKg, double heightCm, Double bodyFatPct, int age,
                                          ActivityLevel activity, Goal goal, TrainingExperience experience,
                                          TrainingType trainingType, Integer customTargetKcal) {
        boolean minor = age < ADULT_AGE;

        BmrFormula formula;
        double bmr;
        if (minor) {
            // Adult equations were built on adults (Mifflin: 19–78 y); use the teen equation instead
            formula = BmrFormula.SCHOFIELD;
            bmr = schofieldTeen(sex, weightKg);
        } else if (bodyFatPct != null) {
            formula = BmrFormula.KATCH_MCARDLE;
            bmr = katchMcArdle(weightKg, bodyFatPct);
        } else {
            formula = BmrFormula.MIFFLIN_ST_JEOR;
            bmr = mifflinStJeor(sex, weightKg, heightCm, age);
        }

        double tdee = bmr * activity.multiplier();

        // A growing teenager should not be put on a calorie deficit: the goal falls back to maintenance
        int adjustment = adjustment(goal, tdee, experience);
        boolean skipDeficit = minor && adjustment < 0;
        if (skipDeficit) {
            adjustment = 0;
        }

        int floor = sex == Sex.MALE ? MIN_KCAL_MALE : MIN_KCAL_FEMALE;
        int suggested = Math.max((int) Math.round(tdee + adjustment), floor);
        int target = customTargetKcal != null ? customTargetKcal : suggested;

        // Body fat is ignored for teenagers (as for the BMR above)
        Protein protein = protein(goal, weightKg, minor ? null : bodyFatPct, trainingType);

        return new EnergyTargets(
                formula.name(),
                (int) Math.round(bmr),
                (int) Math.round(tdee),
                suggested,
                target,
                skipDeficit,
                macros(target),
                (goal == Goal.ENDURANCE ? MacroSplit.HIGHER_CARB : MacroSplit.MODERATE_CARB).name(),
                protein.grams(),
                protein.perKg(),
                protein.basis());
    }

    /** kcal added to the TDEE for the goal (negative = deficit). */
    static int adjustment(Goal goal, double tdee, TrainingExperience experience) {
        return switch (goal) {
            case FAT_LOSS -> FAT_LOSS_DEFICIT;
            case WEIGHT_GAIN -> WEIGHT_GAIN_SURPLUS;
            case LEAN_BULK -> (int) Math.round(tdee * leanBulkSurplus(experience));
            case RECOMP, MAINTAIN, ENDURANCE -> 0;
        };
    }

    static double leanBulkSurplus(TrainingExperience experience) {
        return experience == TrainingExperience.BEGINNER || experience == TrainingExperience.UNDER_1_YEAR
                ? LEAN_BULK_SURPLUS_BEGINNER
                : LEAN_BULK_SURPLUS_TRAINED;
    }

    record Protein(int grams, double perKg, String basis) {
    }

    static Protein protein(Goal goal, double weightKg, Double bodyFatPct, TrainingType trainingType) {
        if (trainingType == TrainingType.LIGHT) {
            double perKg = Math.min(goal.proteinPerKg(), PROTEIN_PER_KG_LIGHT_TRAINING);
            return new Protein((int) Math.round(weightKg * perKg), perKg, BODY_WEIGHT);
        }
        if (goal == Goal.FAT_LOSS && bodyFatPct != null) {
            double leanMassKg = weightKg * (1 - bodyFatPct / 100);
            return new Protein((int) Math.round(leanMassKg * PROTEIN_PER_KG_LEAN_MASS_FAT_LOSS),
                    PROTEIN_PER_KG_LEAN_MASS_FAT_LOSS, LEAN_MASS);
        }
        return new Protein((int) Math.round(weightKg * goal.proteinPerKg()), goal.proteinPerKg(), BODY_WEIGHT);
    }

    // protein and carb: 4 kcal/g, fat: 9 kcal/g
    static List<Macros> macros(int targetKcal) {
        return Arrays.stream(MacroSplit.values())
                .map(s -> new Macros(
                        s.name(),
                        (int) Math.round(targetKcal * s.proteinPct() / 100.0 / 4),
                        (int) Math.round(targetKcal * s.fatPct() / 100.0 / 9),
                        (int) Math.round(targetKcal * s.carbPct() / 100.0 / 4)))
                .toList();
    }
}
