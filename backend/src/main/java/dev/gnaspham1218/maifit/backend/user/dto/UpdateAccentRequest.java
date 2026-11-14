package dev.gnaspham1218.maifit.backend.user.dto;

import dev.gnaspham1218.maifit.backend.user.entity.AccentColor;
import jakarta.validation.constraints.NotNull;

// An unknown name (not in AccentColor) fails JSON reading and answers 400
public record UpdateAccentRequest(@NotNull AccentColor accentColor) {
}
