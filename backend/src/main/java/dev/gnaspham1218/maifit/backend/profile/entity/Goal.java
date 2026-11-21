package dev.gnaspham1218.maifit.backend.profile.entity;

// The user's main goal. Energy and protein targets are computed in TdeeCalculator (sources there).
// proteinPerKg: daily protein per kg of body weight for this goal.
public enum Goal {
    FAT_LOSS(2.2),     // lose fat, keep muscle
    RECOMP(2.0),       // lose fat and build muscle at the same time (maintenance calories)
    MAINTAIN(1.6),     // keep the weight, eat healthily
    LEAN_BULK(2.0),    // build muscle, limit fat gain (small surplus)
    WEIGHT_GAIN(1.6),  // gain weight (+500 kcal)
    ENDURANCE(1.6);    // running, cycling, swimming: maintenance calories, more carbohydrate

    private final double proteinPerKg;

    Goal(double proteinPerKg) {
        this.proteinPerKg = proteinPerKg;
    }

    public double proteinPerKg() {
        return proteinPerKg;
    }
}
