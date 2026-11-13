package dev.gnaspham1218.maifit.backend.chat.eval;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;

import java.util.Set;

/**
 * One line of chat-eval/cases.txt.
 *
 * @param expected        accepted outcomes (several when any refusal is fine, e.g. OUT_OF_SCOPE or NO_INFO)
 * @param sourceSection   when not blank, an ANSWERED reply must cite a section containing this text
 * @param previousQuestion when not blank, asked first so the case is a follow-up question
 * @param portions        when not blank, "Food=BOILED; Other=?": each food must be in the calculation with that
 *                        preparation ("?" = must be left open for the user, never guessed)
 */
public record ChatEvalCase(int line, Set<ChatOutcome> expected, String question, String sourceSection,
                           String previousQuestion, String portions) {
}
