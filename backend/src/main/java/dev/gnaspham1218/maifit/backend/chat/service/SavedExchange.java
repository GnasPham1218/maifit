package dev.gnaspham1218.maifit.backend.chat.service;

/** Ids of what one question saved: the conversation (maybe new) and the reply message. */
public record SavedExchange(Long conversationId, Long answerMessageId) {
}
