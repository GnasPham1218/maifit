package dev.gnaspham1218.maifit.backend.user.dto;

// Never add sensitive fields (e.g. passwordHash) here: MapStruct maps by name
public record UserResponse(
        Long id,
        String email,
        String username,
        String displayName,
        String role
) {
}
