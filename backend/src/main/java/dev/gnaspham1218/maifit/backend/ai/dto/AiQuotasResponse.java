package dev.gnaspham1218.maifit.backend.ai.dto;

/**
 * Today's limits of every AI feature for one user, for the profile page.
 *
 * @param foodVision photo recognition (meals)
 * @param chat       MBotFit questions
 */
public record AiQuotasResponse(AiQuota foodVision, AiQuota chat) {
}
