package dev.gnaspham1218.maifit.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank @Email @Size(max = 254)
        String email,

        // Cloudflare Turnstile token from the widget; checked by TurnstileVerifier (blank -> CAPTCHA_INVALID)
        @Size(max = 2048)
        String captchaToken
) {
}
