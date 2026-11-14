package dev.gnaspham1218.maifit.backend.food.service;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.food.dto.FoodDetailsResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodVariantResponse;
import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FoodDetailsServiceTest {

    private FoodRepository repository;
    private FoodDetailsService service;

    private static Food food(long id, String name, Preparation preparation, String source) {
        Food food = mock(Food.class); // read-only entity without a public constructor
        when(food.getId()).thenReturn(id);
        when(food.getName()).thenReturn(name);
        when(food.getPreparation()).thenReturn(preparation);
        when(food.getKcal()).thenReturn(new BigDecimal("100"));
        when(food.getSource()).thenReturn(source);
        return food;
    }

    @BeforeEach
    void setUp() {
        repository = mock(FoodRepository.class);
        service = new FoodDetailsService(repository);
    }

    @Test
    void groupsEveryPreparationOfTheNameInTheUsualOrder() {
        // Mocks first: stubbing a mock inside another when(...) is an unfinished stubbing
        Food fried = food(3, "Ức gà", Preparation.FRIED, "USDA FDC 171078 (SR Legacy)");
        Food raw = food(1, "Ức gà", Preparation.RAW, "USDA FDC 171077 (SR Legacy)");
        Food boiled = food(2, "Ức gà", Preparation.BOILED, "USDA FDC 171478 (SR Legacy)");
        when(repository.findById(2L)).thenReturn(Optional.of(boiled));
        when(repository.findByNameOrderById("Ức gà")).thenReturn(List.of(fried, raw, boiled));
        when(repository.findAliasesByFoodName("Ức gà")).thenReturn(List.of("Thịt ức gà", "ức gà"));

        FoodDetailsResponse details = service.details(2L);

        assertThat(details.selectedId()).isEqualTo(2L);
        assertThat(details.variants()).extracting(FoodVariantResponse::preparation)
                .containsExactly(Preparation.RAW, Preparation.BOILED, Preparation.FRIED);
        assertThat(details.aliases()).containsExactly("Thịt ức gà"); // the name itself is not an "other name"
    }

    @Test
    void linksOnlyRowsBackedByOneUsdaItem() {
        assertThat(FoodDetailsService.sourceUrl("USDA FDC 168878 (SR Legacy)"))
                .isEqualTo("https://fdc.nal.usda.gov/food-details/168878/nutrients");
        assertThat(FoodDetailsService.sourceUrl("ƯỚC TÍNH: USDA FDC 167812 x tỉ lệ của FDC 167853/167854")).isNull();
        assertThat(FoodDetailsService.sourceUrl("Viện Dinh dưỡng – BTPTP VN, mã 1001")).isNull();
    }

    @Test
    void marksEstimatedRows() {
        Food braised = food(9, "Thịt ba chỉ", Preparation.BRAISED, "ƯỚC TÍNH: USDA FDC 167812 x tỉ lệ sống->kho");
        when(repository.findById(9L)).thenReturn(Optional.of(braised));
        when(repository.findByNameOrderById("Thịt ba chỉ")).thenReturn(List.of(braised));
        when(repository.findAliasesByFoodName("Thịt ba chỉ")).thenReturn(List.of());

        FoodVariantResponse variant = service.details(9L).variants().getFirst();

        assertThat(variant.estimated()).isTrue();
        assertThat(variant.sourceUrl()).isNull();
    }

    @Test
    void anUnknownIdIsNotFound() {
        when(repository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.details(404L))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }
}
