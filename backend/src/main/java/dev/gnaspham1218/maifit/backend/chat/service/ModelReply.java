package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.ai.dto.TokenUsage;

/** What one chat model call returned: the parsed answer and the tokens it was billed. */
public record ModelReply(ModelAnswer answer, TokenUsage usage) {
}
