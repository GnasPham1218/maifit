package dev.gnaspham1218.maifit.backend.ai.dto;

import dev.gnaspham1218.maifit.backend.food.entity.Preparation;

import java.math.BigDecimal;

/**
 * One food found on the photo, already mapped to a foods row.
 * name / preparation come from the foods table; aiName is what the model said.
 * lowConfidence = weak name match or the preparation the AI saw is not in our table: the UI asks to check.
 * Calories are NOT included: the client computes them from the foods table (per 100 g).
 */
public record RecognizedFood(
        Long foodId,
        String name,
        Preparation preparation,
        BigDecimal grams,
        String aiName,
        boolean lowConfidence
) {}
