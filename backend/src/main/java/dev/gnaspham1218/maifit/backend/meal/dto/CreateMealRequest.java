package dev.gnaspham1218.maifit.backend.meal.dto;

import dev.gnaspham1218.maifit.backend.meal.entity.MealType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record CreateMealRequest(
        @NotNull MealType mealType,
        Instant eatenAt, // optional, defaults to now; ISO-8601, e.g. "2026-11-03T05:30:00Z"
        @NotEmpty @Size(max = 30) List<@Valid @NotNull MealItemRequest> items
) {
}
