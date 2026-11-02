package dev.gnaspham1218.maifit.backend.profile.entity;

// Standard TDEE activity multipliers (applied to BMR)
public enum ActivityLevel {
    SEDENTARY(1.2),      // little or no exercise
    LIGHT(1.375),        // 1–3 days/week
    MODERATE(1.55),      // 3–5 days/week
    ACTIVE(1.725),       // 6–7 days/week
    VERY_ACTIVE(1.9);    // hard training or physical job

    private final double multiplier;

    ActivityLevel(double multiplier) {
        this.multiplier = multiplier;
    }

    public double multiplier() {
        return multiplier;
    }
}
