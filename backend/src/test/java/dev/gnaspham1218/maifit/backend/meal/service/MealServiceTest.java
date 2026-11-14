package dev.gnaspham1218.maifit.backend.meal.service;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import dev.gnaspham1218.maifit.backend.meal.dto.UpdateMealItemRequest;
import dev.gnaspham1218.maifit.backend.meal.entity.MealItem;
import dev.gnaspham1218.maifit.backend.meal.entity.MealLog;
import dev.gnaspham1218.maifit.backend.meal.entity.MealType;
import dev.gnaspham1218.maifit.backend.meal.mapper.MealResponseMapper;
import dev.gnaspham1218.maifit.backend.meal.repository.MealLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

// Editing a logged food: grams, fat trim, and switching to another preparation of the same food
class MealServiceTest {

    private static final long USER = 7L;
    private static final long MEAL = 1L;
    private static final long ITEM = 10L;

    private MealLogRepository meals;
    private FoodRepository foods;
    private MealService service;
    private MealItem item;

    private static Food food(long id, String name) {
        Food food = mock(Food.class); // read-only entity without a public constructor
        when(food.getId()).thenReturn(id);
        when(food.getName()).thenReturn(name);
        return food;
    }

    @BeforeEach
    void setUp() {
        meals = mock(MealLogRepository.class);
        foods = mock(FoodRepository.class);
        service = new MealService(meals, foods, mock(MealResponseMapper.class));

        Food rawRice = food(1, "Gạo tẻ");
        MealLog meal = new MealLog(USER, Instant.now(), MealType.BREAKFAST);
        item = meal.addItem(rawRice, new BigDecimal("199"), new BigDecimal("180"), null);
        ReflectionTestUtils.setField(item, "id", ITEM); // the database would set it
        when(meals.findByIdAndUserId(MEAL, USER)).thenReturn(Optional.of(meal));
    }

    private static UpdateMealItemRequest request(String grams, Integer fatPercent, Long foodId) {
        return new UpdateMealItemRequest(new BigDecimal(grams), fatPercent, foodId);
    }

    @Test
    void switchesToAnotherPreparationOfTheSameFood() {
        Food boiledRice = food(2, "Gạo tẻ");
        when(foods.findById(2L)).thenReturn(Optional.of(boiledRice));

        service.updateItem(USER, MEAL, ITEM, request("150", null, 2L));

        assertThat(item.getFood()).isSameAs(boiledRice);
        assertThat(item.getGrams()).isEqualByComparingTo("150");
        assertThat(item.getAiGrams()).isEqualByComparingTo("180"); // the AI's guess is kept for comparison
    }

    @Test
    void refusesADifferentFood() {
        Food egg = food(3, "Trứng gà");
        when(foods.findById(3L)).thenReturn(Optional.of(egg));

        assertThatThrownBy(() -> service.updateItem(USER, MEAL, ITEM, request("150", null, 3L)))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.FOOD_CHANGE_NOT_ALLOWED));
    }

    @Test
    void checksTheFatTrimAgainstTheNewFood() {
        Food boiledRice = food(2, "Gạo tẻ"); // no lean version
        when(foods.findById(2L)).thenReturn(Optional.of(boiledRice));

        assertThatThrownBy(() -> service.updateItem(USER, MEAL, ITEM, request("150", 50, 2L)))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.FAT_PERCENT_NOT_APPLICABLE));
    }
}
