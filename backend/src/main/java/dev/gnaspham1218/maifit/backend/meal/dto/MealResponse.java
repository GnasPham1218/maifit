package dev.gnaspham1218.maifit.backend.meal.dto;

import dev.gnaspham1218.maifit.backend.meal.entity.MealType;

import java.time.Instant;
import java.util.List;

public record MealResponse(
        Long id,
        MealType mealType,
        Instant eatenAt,
        List<MealItemResponse> items,
        Nutrition totals
) {
}
