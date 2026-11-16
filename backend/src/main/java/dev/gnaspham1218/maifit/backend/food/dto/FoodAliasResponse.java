package dev.gnaspham1218.maifit.backend.food.dto;

// An everyday name of one foods row, e.g. "Cơm" for Gạo tẻ (boiled).
// locksPreparation: the name already says how it is cooked, so the search can pick that row directly.
public record FoodAliasResponse(String alias, boolean locksPreparation) {
}
