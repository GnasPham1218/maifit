package dev.gnaspham1218.maifit.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank @Size(max = 100)
        String token,

        // Same rules as RegisterRequest.password
        @NotBlank @Size(min = 8, max = 64)
        String newPassword
) {
}
