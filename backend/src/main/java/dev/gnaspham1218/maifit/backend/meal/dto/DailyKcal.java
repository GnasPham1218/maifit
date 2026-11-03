package dev.gnaspham1218.maifit.backend.meal.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyKcal(LocalDate date, BigDecimal kcal) {
}
