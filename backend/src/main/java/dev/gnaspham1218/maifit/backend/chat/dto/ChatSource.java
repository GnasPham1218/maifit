package dev.gnaspham1218.maifit.backend.chat.dto;

/** One source shown under an answer. Built by the backend from chunk metadata, never by the model. */
public record ChatSource(String title, String section, String url) {
}
