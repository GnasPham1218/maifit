package dev.gnaspham1218.maifit.backend.food.dto;

import dev.gnaspham1218.maifit.backend.food.entity.Preparation;

import java.math.BigDecimal;

// Values per 100 g. The whole table is sent once per page load: the frontend searches and filters it locally.
public record FoodResponse(
        Long id,
        String name,
        Preparation preparation,
        BigDecimal kcal,
        BigDecimal proteinG,
        BigDecimal carbG,
        BigDecimal fatG,
        BigDecimal fiberG,
        Long categoryId,
        Long sourceId,
        String sourceName,  // e.g. "USDA FoodData Central – SR Legacy"
        String sourceRef,   // the item id at the source; null for an estimate
        boolean estimated,
        Long leanVersionId, // non-null -> this food can be logged with a 0-100 fat-trim slider
        FoodImageResponse image // the main photo, or null
) {
}
