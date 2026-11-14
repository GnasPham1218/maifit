package dev.gnaspham1218.maifit.backend.food.dto;

import java.util.List;

// GET /api/foods/{id}/details: every preparation of the food with that id, and its other names
public record FoodDetailsResponse(
        String name,
        List<String> aliases,             // "Cơm", "Cơm trắng"… (never the name itself)
        Long selectedId,                  // the id that was asked for: the tab to open first
        List<FoodVariantResponse> variants // RAW, BOILED, STEAMED, GRILLED, FRIED, BRAISED order
) {
}
