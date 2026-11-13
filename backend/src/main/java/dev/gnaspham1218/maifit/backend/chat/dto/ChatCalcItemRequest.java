package dev.gnaspham1218.maifit.backend.chat.dto;

import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * One food of a calculation as the user corrected it. Only a food and an amount: the numbers are always
 * recalculated by the server from the foods table, never taken from the client.
 *
 * @param preparation null = still to be picked
 * @param estimated   true while the grams are still the model's estimate
 */
public record ChatCalcItemRequest(
        @NotBlank @Size(max = 150) String food,
        Preparation preparation,
        @NotNull @DecimalMin("1") @DecimalMax("2000") @Digits(integer = 4, fraction = 1) BigDecimal grams,
        boolean estimated
) {
}
