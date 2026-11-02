package dev.gnaspham1218.maifit.backend.profile.entity;

// kcalAdjustment: added to TDEE (same ±500 as tdeecalculator.net: cutting / bulking)
public enum Goal {
    LOSE(-500),
    MAINTAIN(0),
    GAIN(500);

    private final int kcalAdjustment;

    Goal(int kcalAdjustment) {
        this.kcalAdjustment = kcalAdjustment;
    }

    public int kcalAdjustment() {
        return kcalAdjustment;
    }
}
