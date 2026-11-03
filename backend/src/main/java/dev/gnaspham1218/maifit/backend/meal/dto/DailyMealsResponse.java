package dev.gnaspham1218.maifit.backend.meal.dto;

import java.time.LocalDate;
import java.util.List;

// One calendar day (Vietnam time). The frontend groups meals by mealType.
public record DailyMealsResponse(
        LocalDate date,
        Nutrition totals,
        List<MealResponse> meals
) {
}
