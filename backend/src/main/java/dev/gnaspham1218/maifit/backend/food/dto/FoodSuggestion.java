package dev.gnaspham1218.maifit.backend.food.dto;

/**
 * A food name close to what the user typed (or what the AI saw), for "món gần giống".
 * Only the name: the client already has every row of the food and asks "raw or cooked?" itself.
 *
 * @param score 0..1, higher = closer
 */
public record FoodSuggestion(String name, double score) {
}
