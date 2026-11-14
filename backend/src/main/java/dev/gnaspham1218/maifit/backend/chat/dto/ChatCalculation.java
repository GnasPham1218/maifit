package dev.gnaspham1218.maifit.backend.chat.dto;

import dev.gnaspham1218.maifit.backend.meal.dto.Nutrition;

import java.util.List;

/**
 * Portions calculated by code under a chatbot answer.
 *
 * @param total sum of the items; null until every item has a preparation (a partial total would mislead)
 */
public record ChatCalculation(List<ChatCalcItem> items, Nutrition total) {
}
