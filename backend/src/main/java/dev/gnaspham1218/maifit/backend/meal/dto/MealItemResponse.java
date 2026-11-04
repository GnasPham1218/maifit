package dev.gnaspham1218.maifit.backend.meal.dto;

import dev.gnaspham1218.maifit.backend.food.entity.Preparation;

import java.math.BigDecimal;

public record MealItemResponse(
        Long id,
        Long foodId,
        String foodName,
        Preparation preparation,
        BigDecimal grams,
        BigDecimal aiGrams,
        Integer fatPercent,
        Long leanVersionId, // non-null -> the frontend may show the fat-trim slider for this item
        Nutrition nutrition // for these grams, not per 100 g
) {
}
