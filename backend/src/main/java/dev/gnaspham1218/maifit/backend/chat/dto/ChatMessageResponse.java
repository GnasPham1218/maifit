package dev.gnaspham1218.maifit.backend.chat.dto;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatRole;

import java.time.Instant;
import java.util.List;

/**
 * One message of a conversation.
 *
 * @param content USER: the question. ASSISTANT: the answer, or null when the bot declined
 *                (the frontend shows its fixed text for the outcome, as for a new reply)
 * @param outcome null for USER messages
 * @param sources the sources saved with the answer (a snapshot), empty otherwise
 */
public record ChatMessageResponse(Long id, ChatRole role, String content, ChatOutcome outcome,
                                  List<ChatSource> sources, Instant createdAt) {
}
