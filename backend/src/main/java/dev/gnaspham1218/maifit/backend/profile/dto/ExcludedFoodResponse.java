package dev.gnaspham1218.maifit.backend.profile.dto;

// A food the user cannot or does not want to eat (every preparation of it). id = its RAW row.
public record ExcludedFoodResponse(Long id, String name) {
}
