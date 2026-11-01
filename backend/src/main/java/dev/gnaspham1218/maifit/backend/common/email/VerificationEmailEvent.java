package dev.gnaspham1218.maifit.backend.common.email;

public record VerificationEmailEvent(String to, String displayName, String link) {
}
