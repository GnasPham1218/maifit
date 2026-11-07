package dev.gnaspham1218.maifit.backend.food.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * POST /api/food-requests: "this food is missing". Only a name: calories are never taken from users.
 * Letters (any language, with accents), digits, spaces and a little punctuation: no URLs, no markup.
 */
public record CreateFoodRequest(
        @NotBlank
        @Size(min = 2, max = 60)
        @Pattern(regexp = "^[\\p{L}\\p{M}\\p{N} ,.'()/-]+$", message = "Tên món chỉ gồm chữ, số và khoảng trắng")
        String name
) {
}
