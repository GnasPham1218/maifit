package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;

import java.util.List;

/**
 * A model answer after the checks.
 *
 * @param answer      non-null only when outcome is ANSWERED
 * @param citedChunks 0-based indexes into the retrieved chunks, no duplicates, empty unless ANSWERED
 */
public record ValidatedAnswer(ChatOutcome outcome, String answer, List<Integer> citedChunks) {

    public static ValidatedAnswer declined(ChatOutcome outcome) {
        return new ValidatedAnswer(outcome, null, List.of());
    }
}
