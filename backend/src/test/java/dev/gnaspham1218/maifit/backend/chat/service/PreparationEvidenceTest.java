package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// The model may only keep a preparation the question really states
class PreparationEvidenceTest {

    private final PreparationEvidence evidence = new PreparationEvidence(List.of(
            new PreparationEvidence.LockedAlias("Gạo tẻ", Preparation.BOILED, "Cơm"),
            new PreparationEvidence.LockedAlias("Trứng gà", Preparation.FRIED, "Trứng ốp la")));

    @Test
    void aWeightAloneIsNotRaw() {   // the eval caught the model choosing RAW here
        assertThat(evidence.isStated("100g ức gà với 1 quả trứng bao nhiêu calo?", "Ức gà", Preparation.RAW)).isFalse();
    }

    @Test
    void aCookingWordIsEvidence() {
        assertThat(evidence.isStated("2 quả trứng luộc", "Trứng gà", Preparation.BOILED)).isTrue();
        assertThat(evidence.isStated("100g ức gà nướng", "Ức gà", Preparation.GRILLED)).isTrue();
        assertThat(evidence.isStated("ức gà sống 100g", "Ức gà", Preparation.RAW)).isTrue();
    }

    @Test
    void anAliasThatFixesThePreparationIsEvidenceForItsFoodOnly() {
        assertThat(evidence.isStated("200g cơm", "Gạo tẻ", Preparation.BOILED)).isTrue();
        assertThat(evidence.isStated("1 quả trứng ốp la", "Trứng gà", Preparation.FRIED)).isTrue();
        assertThat(evidence.isStated("200g cơm", "Gạo tẻ", Preparation.RAW)).isFalse();
    }

    @Test
    void wholeWordsOnly() {
        assertThat(evidence.isStated("ăn khoai", "Khoai lang", Preparation.BRAISED)).isFalse();   // "kho" inside "khoai"
    }

    @Test
    void withoutDiacriticsOnlyUnambiguousWordsCount() {
        assertThat(evidence.isStated("2 qua trung luoc", "Trứng gà", Preparation.BOILED)).isTrue();
        assertThat(evidence.isStated("200g com", "Gạo tẻ", Preparation.BOILED)).isTrue();   // alias, stripped
        assertThat(evidence.isStated("ca kho", "Cá", Preparation.BRAISED)).isFalse();      // kho / khô / khó
    }
}
