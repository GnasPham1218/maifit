package dev.gnaspham1218.maifit.backend.chat.dto;

import java.time.Instant;

/** One row of the conversation list. */
public record ChatConversationResponse(Long id, String title, Instant createdAt, Instant updatedAt) {
}
