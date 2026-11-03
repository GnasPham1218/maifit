package dev.gnaspham1218.maifit.backend.meal.dto;

import java.math.BigDecimal;

// Nutrition of one item or a total. In an item, null = the food has no data for it.
public record Nutrition(
        BigDecimal kcal,
        BigDecimal proteinG,
        BigDecimal carbG,
        BigDecimal fatG,
        BigDecimal fiberG
) {
}
