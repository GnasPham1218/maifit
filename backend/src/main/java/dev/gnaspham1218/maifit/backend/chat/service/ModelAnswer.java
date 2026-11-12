package dev.gnaspham1218.maifit.backend.chat.service;

import java.util.List;

/**
 * What the model returns (structured output). Untrusted: ModelAnswerValidator checks every field.
 *
 * @param outcome     ANSWERED, NO_INFO, MEDICAL or OUT_OF_SCOPE (kept as text so an unknown value cannot break parsing)
 * @param answer      the answer in Vietnamese, empty unless ANSWERED
 * @param citedChunks numbers of the excerpts used, 1-based as written in the prompt
 */
public record ModelAnswer(String outcome, String answer, List<Integer> citedChunks) {
}
