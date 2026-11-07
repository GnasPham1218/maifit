package dev.gnaspham1218.maifit.backend.meal.mapper;

import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.meal.dto.MealItemResponse;
import dev.gnaspham1218.maifit.backend.meal.dto.MealResponse;
import dev.gnaspham1218.maifit.backend.meal.dto.Nutrition;
import dev.gnaspham1218.maifit.backend.meal.entity.MealItem;
import dev.gnaspham1218.maifit.backend.meal.entity.MealLog;
import dev.gnaspham1218.maifit.backend.meal.service.NutritionCalculator;
import org.springframework.stereotype.Component;

import java.util.List;

// Hand-written instead of MapStruct: most fields here are computed (nutrition, totals) or
// flattened from the food, not copied 1-1, which is what MapStruct is good at.
// Must be called inside a transaction (items and foods are lazy).
@Component
public class MealResponseMapper {

    public MealResponse toResponse(MealLog meal) {
        List<MealItemResponse> items = meal.getItems().stream().map(this::toItemResponse).toList();
        Nutrition totals = NutritionCalculator.sum(items.stream().map(MealItemResponse::nutrition).toList());
        return new MealResponse(meal.getId(), meal.getMealType(), meal.getEatenAt(), items, totals);
    }

    private MealItemResponse toItemResponse(MealItem item) {
        Food food = item.getFood();
        return new MealItemResponse(
                item.getId(),
                food.getId(),
                food.getName(),
                food.getPreparation(),
                item.getGrams(),
                item.getAiGrams(),
                item.getFatPercent(),
                food.getLeanVersionId(),
                NutritionCalculator.forItem(food, item.getGrams(), item.getFatPercent()));
    }
}
