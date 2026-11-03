package dev.gnaspham1218.maifit.backend.meal.dto;

import java.util.List;

// month: "2026-11". days: only days that have meals (a day without data is NOT sent as 0)
public record MonthlySummaryResponse(
        String month,
        List<DailyKcal> days
) {
}
