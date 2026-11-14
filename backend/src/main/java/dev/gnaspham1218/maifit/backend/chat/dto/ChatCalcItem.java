package dev.gnaspham1218.maifit.backend.chat.dto;

import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import dev.gnaspham1218.maifit.backend.meal.dto.Nutrition;

import java.math.BigDecimal;
import java.util.List;

/**
 * One food of a calculation under a chatbot answer.
 *
 * @param food        food name exactly as in the foods table
 * @param foodId      the foods row used (name + preparation), null while preparation is null;
 *                    lets the frontend log the portion as a meal item
 * @param preparation null = not known yet: the user picks one of the options (the model never guesses)
 * @param options     preparations this food has in the table
 * @param estimated   true when the model estimated the grams ("1 bát cơm"), false when the user gave them
 * @param nutrition   calculated by NutritionCalculator; null while preparation is null
 */
public record ChatCalcItem(String food, Long foodId, Preparation preparation, List<Preparation> options, BigDecimal grams,
                           boolean estimated, Nutrition nutrition) {
}
