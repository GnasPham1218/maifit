package dev.gnaspham1218.maifit.backend.common.email;

public record PasswordResetEmailEvent(String to, String displayName, String link) {
}
