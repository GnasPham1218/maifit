package dev.gnaspham1218.maifit.backend.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * One question. Without conversationId a new conversation is started.
 * 500 = app.chat.max-question-chars; ChatService checks the configured value again.
 */
public record ChatAskRequest(
        @Positive Long conversationId,
        @NotBlank @Size(max = 500) String question
) {
}
