package dev.gnaspham1218.maifit.backend.profile.service;

// % of target kcal for protein / fat / carb (sums to 100). Same three options as tdeecalculator.net.
public enum MacroSplit {
    MODERATE_CARB(30, 35, 35),
    LOWER_CARB(40, 40, 20),
    HIGHER_CARB(30, 20, 50);

    private final int proteinPct;
    private final int fatPct;
    private final int carbPct;

    MacroSplit(int proteinPct, int fatPct, int carbPct) {
        this.proteinPct = proteinPct;
        this.fatPct = fatPct;
        this.carbPct = carbPct;
    }

    public int proteinPct() { return proteinPct; }
    public int fatPct() { return fatPct; }
    public int carbPct() { return carbPct; }
}
