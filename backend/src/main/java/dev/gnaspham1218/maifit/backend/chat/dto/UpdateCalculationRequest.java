package dev.gnaspham1218.maifit.backend.chat.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** The whole corrected list (change a food, edit grams, remove, add). Empty = no calculation any more. */
public record UpdateCalculationRequest(@NotNull @Size(max = 10) List<@Valid @NotNull ChatCalcItemRequest> items) {
}
