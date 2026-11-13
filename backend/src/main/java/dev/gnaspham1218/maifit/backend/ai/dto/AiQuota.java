package dev.gnaspham1218.maifit.backend.ai.dto;

/**
 * One AI feature for one user today (Vietnam time).
 *
 * @param limit          calls allowed today, depends on the plan (free / Premium)
 * @param remainingToday calls left today
 */
public record AiQuota(int limit, int remainingToday) {
}
