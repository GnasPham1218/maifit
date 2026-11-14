package dev.gnaspham1218.maifit.backend.food.service;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.food.dto.FoodDetailsResponse;
import dev.gnaspham1218.maifit.backend.food.dto.FoodVariantResponse;
import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.food.entity.FoodCategory;
import dev.gnaspham1218.maifit.backend.food.entity.FoodImage;
import dev.gnaspham1218.maifit.backend.food.entity.FoodSource;
import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import dev.gnaspham1218.maifit.backend.food.mapper.FoodMapper;
import dev.gnaspham1218.maifit.backend.food.repository.FoodImageRepository;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FoodDetailsServiceTest {

    private static final String FDC_TEMPLATE = "https://fdc.nal.usda.gov/food-details/{ref}/nutrients";

    private FoodRepository repository;
    private FoodImageRepository images;
    private FoodDetailsService service;
    private FoodSource usda;
    private FoodCategory meat;

    private Food food(long id, String name, Preparation preparation, String ref, boolean estimated) {
        Food food = mock(Food.class); // read-only entity without a public constructor
        when(food.getId()).thenReturn(id);
        when(food.getName()).thenReturn(name);
        when(food.getPreparation()).thenReturn(preparation);
        when(food.getKcal()).thenReturn(new BigDecimal("100"));
        when(food.getSource()).thenReturn(usda);
        when(food.getCategory()).thenReturn(meat);
        when(food.getSourceRef()).thenReturn(ref);
        when(food.isEstimated()).thenReturn(estimated);
        when(food.getSourceUrl()).thenReturn(estimated ? null : FoodSource.itemUrl(FDC_TEMPLATE, ref));
        return food;
    }

    private static FoodImage image(long foodId, String path) {
        FoodImage image = mock(FoodImage.class);
        when(image.getFoodId()).thenReturn(foodId);
        when(image.getPath()).thenReturn(path);
        return image;
    }

    @BeforeEach
    void setUp() {
        repository = mock(FoodRepository.class);
        images = mock(FoodImageRepository.class);
        service = new FoodDetailsService(repository, images, new FoodMapper());
        usda = mock(FoodSource.class);
        when(usda.getName()).thenReturn("USDA FoodData Central – SR Legacy");
        meat = mock(FoodCategory.class);
        when(meat.getName()).thenReturn("Thịt");
        when(images.findByFoodIdInOrderByFoodIdAscSortOrderAsc(anyCollection())).thenReturn(List.of());
    }

    @Test
    void groupsEveryPreparationOfTheNameInTheUsualOrder() {
        // Mocks first: stubbing a mock inside another when(...) is an unfinished stubbing
        Food fried = food(3, "Ức gà", Preparation.FRIED, "171078", false);
        Food raw = food(1, "Ức gà", Preparation.RAW, "171077", false);
        Food boiled = food(2, "Ức gà", Preparation.BOILED, "171478", false);
        when(repository.findById(2L)).thenReturn(Optional.of(boiled));
        when(repository.findByNameOrderById("Ức gà")).thenReturn(List.of(fried, raw, boiled));
        when(repository.findAliasesByFoodName("Ức gà")).thenReturn(List.of("Thịt ức gà", "ức gà"));

        FoodDetailsResponse details = service.details(2L);

        assertThat(details.selectedId()).isEqualTo(2L);
        assertThat(details.category().name()).isEqualTo("Thịt");
        assertThat(details.variants()).extracting(FoodVariantResponse::preparation)
                .containsExactly(Preparation.RAW, Preparation.BOILED, Preparation.FRIED);
        assertThat(details.aliases()).containsExactly("Thịt ức gà"); // the name itself is not an "other name"
    }

    @Test
    void eachPreparationGetsItsOwnPhotos() {
        Food raw = food(1, "Gạo tẻ", Preparation.RAW, "168877", false);
        Food boiled = food(2, "Gạo tẻ", Preparation.BOILED, "168878", false);
        FoodImage grains = image(1, "foods/gao-te-raw-1.webp");
        FoodImage bowl = image(2, "foods/gao-te-boiled-1.webp");
        FoodImage plate = image(2, "foods/gao-te-boiled-2.webp");
        when(repository.findById(2L)).thenReturn(Optional.of(boiled));
        when(repository.findByNameOrderById("Gạo tẻ")).thenReturn(List.of(raw, boiled));
        when(repository.findAliasesByFoodName("Gạo tẻ")).thenReturn(List.of());
        when(images.findByFoodIdInOrderByFoodIdAscSortOrderAsc(anyCollection())).thenReturn(List.of(grains, bowl, plate));

        List<FoodVariantResponse> variants = service.details(2L).variants();

        assertThat(variants.get(0).images()).extracting(i -> i.path()).containsExactly("foods/gao-te-raw-1.webp");
        assertThat(variants.get(1).images()).extracting(i -> i.path())
                .containsExactly("foods/gao-te-boiled-1.webp", "foods/gao-te-boiled-2.webp");
    }

    @Test
    void anEstimateHasNoLinkAndNoRef() {
        Food braised = food(9, "Thịt ba chỉ", Preparation.BRAISED, null, true);
        when(repository.findById(9L)).thenReturn(Optional.of(braised));
        when(repository.findByNameOrderById("Thịt ba chỉ")).thenReturn(List.of(braised));
        when(repository.findAliasesByFoodName("Thịt ba chỉ")).thenReturn(List.of());

        FoodVariantResponse variant = service.details(9L).variants().getFirst();

        assertThat(variant.estimated()).isTrue();
        assertThat(variant.sourceUrl()).isNull();
    }

    @Test
    void buildsTheItemLinkFromTheSourceTemplate() {
        assertThat(FoodSource.itemUrl(FDC_TEMPLATE, "168878"))
                .isEqualTo("https://fdc.nal.usda.gov/food-details/168878/nutrients");
        assertThat(FoodSource.itemUrl(null, "1001")).isNull(); // a source without item pages
        assertThat(FoodSource.itemUrl(FDC_TEMPLATE, null)).isNull();
    }

    @Test
    void anUnknownIdIsNotFound() {
        when(repository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.details(404L))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }
}
