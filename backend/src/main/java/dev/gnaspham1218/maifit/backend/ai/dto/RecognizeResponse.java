package dev.gnaspham1218.maifit.backend.ai.dto;

import java.util.List;

/**
 * Suggestions for the review screen. Nothing is saved until the client posts a meal.
 * unmatched = names the model saw that match no food in our table (shown so the user can add them by hand).
 */
public record RecognizeResponse(
        List<RecognizedFood> items,
        List<String> unmatched,
        int remainingToday
) {}
