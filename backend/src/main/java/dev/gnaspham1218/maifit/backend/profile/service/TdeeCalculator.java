package dev.gnaspham1218.maifit.backend.profile.service;

import dev.gnaspham1218.maifit.backend.profile.dto.EnergyTargets;
import dev.gnaspham1218.maifit.backend.profile.dto.Macros;
import dev.gnaspham1218.maifit.backend.profile.entity.ActivityLevel;
import dev.gnaspham1218.maifit.backend.profile.entity.Goal;
import dev.gnaspham1218.maifit.backend.profile.entity.Sex;

import java.time.LocalDate;
import java.time.Period;
import java.util.Arrays;
import java.util.List;

// Pure calculation: no Spring, no database -> easy to unit test.
// Follows tdeecalculator.net for adults (Katch-McArdle when body fat is known, otherwise Mifflin-St Jeor,
// TDEE = BMR x activity multiplier, ±500 kcal for cutting / bulking, 3 macro splits),
// plus an age rule for teenagers.
public final class TdeeCalculator {

    static final int ADULT_AGE = 18;
    // Never suggest less than this (not on tdeecalculator.net: an extra safety floor for the app)
    static final int MIN_KCAL_MALE = 1500;
    static final int MIN_KCAL_FEMALE = 1200;

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
     */
    public static EnergyTargets calculate(Sex sex, double weightKg, double heightCm, Double bodyFatPct, int age,
                                          ActivityLevel activity, Goal goal, Integer customTargetKcal) {
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

        // A growing teenager should not be put on a calorie deficit: LOSE falls back to maintenance
        boolean skipDeficit = minor && goal.kcalAdjustment() < 0;
        int adjustment = skipDeficit ? 0 : goal.kcalAdjustment();

        int floor = sex == Sex.MALE ? MIN_KCAL_MALE : MIN_KCAL_FEMALE;
        int suggested = Math.max((int) Math.round(tdee + adjustment), floor);
        int target = customTargetKcal != null ? customTargetKcal : suggested;

        return new EnergyTargets(
                formula.name(),
                (int) Math.round(bmr),
                (int) Math.round(tdee),
                suggested,
                target,
                skipDeficit,
                macros(target));
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
