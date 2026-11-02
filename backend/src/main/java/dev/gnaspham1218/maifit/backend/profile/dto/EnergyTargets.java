package dev.gnaspham1218.maifit.backend.profile.dto;

import java.util.List;

// All values in kcal/day. targetKcal = the user's custom target if set, otherwise suggestedKcal.
public record EnergyTargets(
        String formula,                 // SCHOFIELD / KATCH_MCARDLE / MIFFLIN_ST_JEOR
        int bmr,
        int tdee,
        int suggestedKcal,
        int targetKcal,
        boolean deficitSkippedForMinor, // under 18 + goal LOSE: no deficit is applied
        List<Macros> macros             // one entry per MacroSplit, computed from targetKcal
) {
}
