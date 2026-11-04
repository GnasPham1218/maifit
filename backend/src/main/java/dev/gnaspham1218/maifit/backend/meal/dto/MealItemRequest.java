package dev.gnaspham1218.maifit.backend.meal.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

// Same limits as the DB: grams NUMERIC(6,1), CHECK (grams > 0 AND grams <= 5000)
// aiGrams: the AI's original estimate when the item came from a photo, null when typed by hand.
// The constraints on aiGrams only apply when it is present.
public record MealItemRequest(
        @NotNull Long foodId,
        @NotNull @DecimalMin("0.1") @DecimalMax("5000.0") @Digits(integer = 4, fraction = 1) BigDecimal grams,
        @DecimalMin("0.1") @DecimalMax("5000.0") @Digits(integer = 4, fraction = 1) BigDecimal aiGrams
) {
}
