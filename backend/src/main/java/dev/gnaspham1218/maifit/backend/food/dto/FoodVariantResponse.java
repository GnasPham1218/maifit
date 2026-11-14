package dev.gnaspham1218.maifit.backend.food.dto;

import dev.gnaspham1218.maifit.backend.food.entity.Preparation;

import java.math.BigDecimal;

// One preparation of a food on the detail page. Values per 100 g; null = not measured by the source.
public record FoodVariantResponse(
        Long id,
        Preparation preparation,
        BigDecimal kcal,
        BigDecimal proteinG,
        BigDecimal carbG,
        BigDecimal fatG,
        BigDecimal fiberG,
        String source,             // e.g. "USDA FDC 168878 (SR Legacy)"
        String sourceDescription,  // the source's own name for the item; null when estimated
        String sourceUrl,          // link to the source item; null when there is no single item to link
        boolean approximate,       // closest item used, the source has no exact match (XẤP XỈ)
        boolean estimated,         // computed from other measured rows (ƯỚC TÍNH)
        Long leanVersionId
) {
}
