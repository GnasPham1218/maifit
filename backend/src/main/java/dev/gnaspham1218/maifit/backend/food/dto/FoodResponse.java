package dev.gnaspham1218.maifit.backend.food.dto;

import dev.gnaspham1218.maifit.backend.food.entity.Preparation;

import java.math.BigDecimal;

// Values per 100 g
public record FoodResponse(
        Long id,
        String name,
        Preparation preparation,
        BigDecimal kcal,
        BigDecimal proteinG,
        BigDecimal carbG,
        BigDecimal fatG,
        BigDecimal fiberG,
        String source,
        Long leanVersionId // non-null -> this food can be logged with a 0-100 fat-trim slider
) {
}
