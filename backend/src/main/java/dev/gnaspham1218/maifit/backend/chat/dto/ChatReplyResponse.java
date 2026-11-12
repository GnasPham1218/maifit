package dev.gnaspham1218.maifit.backend.chat.dto;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;

import java.util.List;

/**
 * Reply to one question.
 *
 * @param answer         the answer text, only when outcome is ANSWERED (the frontend has a fixed text for each refusal)
 * @param remainingToday chat calls left today, or null when this question did not use one (declined before the AI call)
 */
public record ChatReplyResponse(
        Long conversationId,
        ChatOutcome outcome,
        String answer,
        List<ChatSource> sources,
        Integer remainingToday
) {
}
