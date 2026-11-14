package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.dto.ChatCalcItem;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatCalculation;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import dev.gnaspham1218.maifit.backend.meal.dto.Nutrition;
import dev.gnaspham1218.maifit.backend.meal.service.NutritionCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Turns the portions the model read from a question into numbers, with the meal page's own
 * NutritionCalculator: the chatbot and the meal log can never disagree.
 * A food with several preparations and none given stays open: the user picks, nothing is guessed.
 * The user can also correct the list (another food, other grams, remove, add): recalculate() runs it again.
 */
@Component
@RequiredArgsConstructor
public class ChatPortionCalculator {

    private final FoodRepository foods;

    /** Null when there is nothing to calculate. */
    public ChatCalculation calculate(List<PortionRequest> portions) {
        List<ChatCalcItem> items = new ArrayList<>();
        for (PortionRequest portion : portions) {
            List<Food> rows = foods.findByNameOrderById(portion.food());
            if (!rows.isEmpty()) {   // renamed or removed since the last ingest: skip it
                items.add(item(rows, portion.food(), portion.preparation(), portion.grams(), portion.estimated()));
            }
        }
        return items.isEmpty() ? null : withTotal(items);
    }

    /**
     * The list the user corrected. Unlike calculate() (portions from the model), a food that does not exist
     * or a preparation it does not have is an error: the user picked it from our own list.
     * Null when the list is empty.
     */
    public ChatCalculation recalculate(List<PortionRequest> portions) {
        List<ChatCalcItem> items = new ArrayList<>();
        for (PortionRequest portion : portions) {
            List<Food> rows = foods.findByNameOrderById(portion.food());
            if (rows.isEmpty()) {
                throw new AppException(ErrorCode.FOOD_NOT_FOUND, "No food named " + portion.food());
            }
            if (portion.preparation() != null
                    && rows.stream().noneMatch(food -> food.getPreparation() == portion.preparation())) {
                throw new AppException(ErrorCode.VALIDATION_FAILED, "This food has no such preparation");
            }
            items.add(item(rows, portion.food(), portion.preparation(), portion.grams(), portion.estimated()));
        }
        return items.isEmpty() ? null : withTotal(items);
    }

    private static ChatCalcItem item(List<Food> rows, String name, Preparation wanted, BigDecimal grams,
                                     boolean estimated) {
        List<Preparation> options = rows.stream().map(Food::getPreparation).distinct().toList();
        // Only one way to have it: nothing to ask. Otherwise the asked preparation, if the table has it.
        Food chosen = options.size() == 1
                ? rows.getFirst()
                : rows.stream().filter(food -> food.getPreparation() == wanted).findFirst().orElse(null);
        return new ChatCalcItem(name, chosen == null ? null : chosen.getId(),
                chosen == null ? null : chosen.getPreparation(), options, grams, estimated,
                chosen == null ? null : NutritionCalculator.forItem(chosen, grams));
    }

    private static ChatCalculation withTotal(List<ChatCalcItem> items) {
        boolean complete = items.stream().allMatch(item -> item.nutrition() != null);
        Nutrition total = complete ? NutritionCalculator.sum(items.stream().map(ChatCalcItem::nutrition).toList()) : null;
        return new ChatCalculation(List.copyOf(items), total);
    }
}
