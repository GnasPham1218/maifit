package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.dto.ChatCalculation;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

// Portions under a chatbot answer: numbers from the foods table, nothing guessed
class ChatPortionCalculatorTest {

    private FoodRepository foods;
    private ChatPortionCalculator calculator;

    private static Food food(Preparation preparation, String kcal) {
        Food food = mock(Food.class);   // read-only entity without a public constructor
        when(food.getPreparation()).thenReturn(preparation);
        when(food.getKcal()).thenReturn(new BigDecimal(kcal));
        return food;
    }

    @BeforeEach
    void setUp() {
        foods = mock(FoodRepository.class);
        calculator = new ChatPortionCalculator(foods);
        // Food mocks are built BEFORE when(...): stubbing a mock inside another when(...) is an unfinished stubbing
        List<Food> rice = List.of(food(Preparation.RAW, "365"), food(Preparation.BOILED, "130"));
        List<Food> egg = List.of(food(Preparation.RAW, "143"), food(Preparation.BOILED, "155"),
                food(Preparation.FRIED, "196"));
        List<Food> banana = List.of(food(Preparation.RAW, "89"));
        when(foods.findByNameOrderById("Gạo tẻ")).thenReturn(rice);
        when(foods.findByNameOrderById("Trứng gà")).thenReturn(egg);
        when(foods.findByNameOrderById("Chuối")).thenReturn(banana);
    }

    private static PortionRequest portion(String food, Preparation preparation, String grams) {
        return new PortionRequest(food, preparation, new BigDecimal(grams), false);
    }

    @Test
    void calculatesFromTheTableAndAddsUp() {
        ChatCalculation result = calculator.calculate(List.of(
                portion("Gạo tẻ", Preparation.BOILED, "200"),
                portion("Trứng gà", Preparation.BOILED, "50")));

        assertThat(result.items()).extracting(item -> item.nutrition().kcal())
                .containsExactly(new BigDecimal("260.0"), new BigDecimal("77.5"));
        assertThat(result.total().kcal()).isEqualByComparingTo("337.5");
    }

    @Test
    void anOpenPreparationIsAskedAndThereIsNoTotalYet() {
        ChatCalculation result = calculator.calculate(List.of(
                portion("Gạo tẻ", Preparation.BOILED, "200"),
                portion("Trứng gà", null, "50")));

        assertThat(result.items().get(1).preparation()).isNull();
        assertThat(result.items().get(1).nutrition()).isNull();
        assertThat(result.items().get(1).options())
                .containsExactly(Preparation.RAW, Preparation.BOILED, Preparation.FRIED);
        assertThat(result.total()).isNull();   // a partial total would mislead
    }

    @Test
    void aFoodWithOnePreparationNeedsNoQuestion() {
        ChatCalculation result = calculator.calculate(List.of(portion("Chuối", null, "120")));

        assertThat(result.items().getFirst().preparation()).isEqualTo(Preparation.RAW);
        assertThat(result.total().kcal()).isEqualByComparingTo("106.8");
    }

    @Test
    void aCorrectedListIsRecalculatedFromTheTable() {
        // The user picked "Chiên" for the egg, changed the rice to 150 g and added a banana
        ChatCalculation result = calculator.recalculate(List.of(
                portion("Gạo tẻ", Preparation.BOILED, "150"),
                portion("Trứng gà", Preparation.FRIED, "50"),
                portion("Chuối", null, "120")));

        assertThat(result.items()).extracting(item -> item.nutrition().kcal())
                .containsExactly(new BigDecimal("195.0"), new BigDecimal("98.0"), new BigDecimal("106.8"));
        assertThat(result.total().kcal()).isEqualByComparingTo("399.8");
    }

    @Test
    void aCorrectionWithAnUnknownFoodOrPreparationIsRejected() {
        assertThatThrownBy(() -> calculator.recalculate(List.of(portion("Món đã xoá", Preparation.RAW, "100"))))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.FOOD_NOT_FOUND));
        assertThatThrownBy(() -> calculator.recalculate(List.of(portion("Trứng gà", Preparation.BRAISED, "50"))))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_FAILED));
    }

    @Test
    void removingEveryFoodRemovesTheCalculation() {
        assertThat(calculator.recalculate(List.of())).isNull();
    }

    @Test
    void unknownFoodsAreSkipped() {
        assertThat(calculator.calculate(List.of(portion("Món đã xoá", Preparation.RAW, "100")))).isNull();
        assertThat(calculator.calculate(List.of())).isNull();
    }
}
