package dev.gnaspham1218.maifit.backend.profile.service;

// Which equation produced the BMR (returned to the UI so the user knows how it was computed)
public enum BmrFormula {
    SCHOFIELD,        // age 13–17: weight-based equation for 10–18 year olds (Schofield 1985, used by WHO)
    KATCH_MCARDLE,    // adult with body fat %: 370 + 21.6 x lean body mass
    MIFFLIN_ST_JEOR   // adult without body fat % (Mifflin et al. 1990)
}
