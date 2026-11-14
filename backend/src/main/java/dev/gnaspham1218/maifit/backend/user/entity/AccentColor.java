package dev.gnaspham1218.maifit.backend.user.entity;

/**
 * Accent colors the user can pick. A fixed list on purpose: each one was checked for at least 4.5:1
 * contrast with white text (WCAG AA), which a free color picker could not guarantee.
 * The hex values live in the frontend (global.css); same list as CHECK ck_users_accent_color.
 */
public enum AccentColor {
    BLUE,
    TEAL,
    GREEN,
    ORANGE,
    PURPLE,
    PINK
}
