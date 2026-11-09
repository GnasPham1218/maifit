package dev.gnaspham1218.maifit.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 254)
        String email,

        // Any case is accepted here; the service stores it in lower case
        @NotBlank @Pattern(regexp = "^[A-Za-z0-9_]{3,30}$",
                message = "must be 3-30 characters: letters, digits or underscore")
        String username,

        // BCrypt only uses the first 72 bytes, so cap the length well below that
        @NotBlank @Size(min = 8, max = 64)
        String password,

        @NotBlank @Size(max = 50)
        String displayName,

        // Cloudflare Turnstile token from the widget; checked by TurnstileVerifier (blank -> CAPTCHA_INVALID)
        @Size(max = 2048)
        String captchaToken
) {
}
