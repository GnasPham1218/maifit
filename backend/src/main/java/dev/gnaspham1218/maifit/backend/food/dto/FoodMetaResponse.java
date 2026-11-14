package dev.gnaspham1218.maifit.backend.food.dto;

import java.util.List;

// GET /api/foods/meta: the filter choices of the food library (groups in display order, sources)
public record FoodMetaResponse(List<FoodCategoryResponse> categories, List<FoodSourceResponse> sources) {
}
