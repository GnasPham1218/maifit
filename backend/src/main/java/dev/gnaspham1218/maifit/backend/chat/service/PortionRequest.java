package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.food.entity.Preparation;

import java.math.BigDecimal;

/**
 * A portion that passed the checks: a food of the table, a sane amount.
 *
 * @param food        food name exactly as in the foods table (from the chunk metadata, not from the model's text)
 * @param preparation null when the question did not say: the user will pick
 * @param grams       1..2000, whole grams
 */
public record PortionRequest(String food, Preparation preparation, BigDecimal grams, boolean estimated) {
}
