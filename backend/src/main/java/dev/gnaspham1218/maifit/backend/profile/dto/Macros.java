package dev.gnaspham1218.maifit.backend.profile.dto;

// Daily macro targets in grams for one split (see MacroSplit)
public record Macros(
        String split,
        int proteinG,
        int fatG,
        int carbG
) {
}
