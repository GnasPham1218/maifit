package dev.gnaspham1218.maifit.backend.meal.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

// fatPercent: 0-100, or null to use the food as listed (no trim). Only accepted when the
// item's food has a lean/fat pair (V11); otherwise the service rejects it.
// foodId: null keeps the food. Otherwise another preparation of the SAME food ("weighed raw" -> "weighed
// boiled"); a different food is a different item on the plate: remove it and add the right one.
public record UpdateMealItemRequest(
        @NotNull @DecimalMin("0.1") @DecimalMax("5000.0") @Digits(integer = 4, fraction = 1) BigDecimal grams,
        @Min(0) @Max(100) Integer fatPercent,
        Long foodId
) {
}
