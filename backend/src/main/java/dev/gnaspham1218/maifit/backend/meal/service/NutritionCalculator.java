package dev.gnaspham1218.maifit.backend.meal.service;

import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.meal.dto.Nutrition;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;

// The only place that turns grams into nutrition. Pure functions -> easy to unit test.
// Calories always come from foods.kcal (never 4P + 4C + 9F: USDA uses food-specific factors).
public final class NutritionCalculator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal ZERO = new BigDecimal("0.0");
    public static final Nutrition EMPTY = new Nutrition(ZERO, ZERO, ZERO, ZERO, ZERO);

    private NutritionCalculator() {
    }

    // value = grams x per100g / 100, rounded to 0.1. A null in the food stays null.
    public static Nutrition forItem(Food food, BigDecimal grams) {
        return new Nutrition(
                scale(food.getKcal(), grams),
                scale(food.getProteinG(), grams),
                scale(food.getCarbG(), grams),
                scale(food.getFatG(), grams),
                scale(food.getFiberG(), grams));
    }

    // fatPercent: 0-100, how much of this food's as-sold fat the person is keeping
    // (100 = eat it as listed, 0 = as if it were the lean-only row). Both ends are real
    // USDA rows (V11); everything between is linear interpolation, not new data.
    // Caller must only pass fatPercent != null when food.getLeanVersion() != null.
    public static Nutrition forItem(Food food, BigDecimal grams, Integer fatPercent) {
        if (fatPercent == null) {
            return forItem(food, grams);
        }
        Food lean = food.getLeanVersion();
        BigDecimal r = BigDecimal.valueOf(fatPercent).divide(HUNDRED, 4, RoundingMode.HALF_UP);
        return new Nutrition(
                interpolate(lean.getKcal(), food.getKcal(), r, grams),
                interpolate(lean.getProteinG(), food.getProteinG(), r, grams),
                interpolate(lean.getCarbG(), food.getCarbG(), r, grams),
                interpolate(lean.getFatG(), food.getFatG(), r, grams),
                interpolate(lean.getFiberG(), food.getFiberG(), r, grams));
    }

    // Totals add the rounded item values, so the numbers on screen always add up.
    // Unknown (null) values are skipped, so a total is the sum of what is known.
    public static Nutrition sum(Collection<Nutrition> parts) {
        Nutrition total = EMPTY;
        for (Nutrition n : parts) {
            total = new Nutrition(
                    add(total.kcal(), n.kcal()),
                    add(total.proteinG(), n.proteinG()),
                    add(total.carbG(), n.carbG()),
                    add(total.fatG(), n.fatG()),
                    add(total.fiberG(), n.fiberG()));
        }
        return total;
    }

    private static BigDecimal scale(BigDecimal per100g, BigDecimal grams) {
        if (per100g == null) {
            return null;
        }
        return per100g.multiply(grams).divide(HUNDRED, 1, RoundingMode.HALF_UP);
    }

    // per100g value at ratio r between lean (r=0) and fatty (r=1), then scaled by grams
    private static BigDecimal interpolate(BigDecimal lean, BigDecimal fatty, BigDecimal r, BigDecimal grams) {
        if (lean == null || fatty == null) {
            return null;
        }
        BigDecimal per100g = lean.add(fatty.subtract(lean).multiply(r));
        return scale(per100g, grams);
    }

    private static BigDecimal add(BigDecimal total, BigDecimal value) {
        return value == null ? total : total.add(value);
    }
}
