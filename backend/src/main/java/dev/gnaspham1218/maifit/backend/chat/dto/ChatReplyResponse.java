package dev.gnaspham1218.maifit.backend.chat.dto;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;

import java.util.List;

/**
 * Reply to one question.
 *
 * @param messageId      id of the saved reply (to pick a preparation in its calculation)
 * @param answer         the answer text, only when outcome is ANSWERED (the frontend has a fixed text for each refusal)
 * @param calculation    portions calculated by code, or null
 * @param remainingToday chat calls left today, or null when this question did not use one (declined before the AI call)
 */
public record ChatReplyResponse(
        Long conversationId,
        Long messageId,
        ChatOutcome outcome,
        String answer,
        List<ChatSource> sources,
        ChatCalculation calculation,
        Integer remainingToday
) {
}
