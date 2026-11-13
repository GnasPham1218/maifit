package dev.gnaspham1218.maifit.backend.chat.service;

import org.junit.jupiter.api.Test;

import java.text.Normalizer;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

// The exact half of the hybrid food search
class FoodNameMatcherTest {

    private final FoodNameMatcher matcher = FoodNameMatcher.of(List.of(
            Map.entry("Gạo tẻ", "Gạo tẻ"), Map.entry("Cơm", "Gạo tẻ"),
            Map.entry("Trứng gà", "Trứng gà"), Map.entry("Trứng", "Trứng gà"), Map.entry("Trứng luộc", "Trứng gà"),
            Map.entry("Ức gà", "Ức gà"), Map.entry("Gà", "Ức gà"),
            Map.entry("Chuối", "Chuối"),
            Map.entry("Sữa tươi không đường", "Sữa tươi không đường"), Map.entry("Sữa", "Sữa tươi không đường"),
            Map.entry("Sữa chua không đường", "Sữa chua không đường"), Map.entry("Sữa chua", "Sữa chua không đường"),
            Map.entry("Bơ", "Bơ"), Map.entry("Thịt bò", "Thịt bò"), Map.entry("Bò", "Thịt bò"),
            Map.entry("Sữa tươi", "Sữa tươi không đường")));

    @Test
    void findsEveryNamedFoodInQuestionOrder() {
        assertThat(matcher.find("200g cơm, 1 quả trứng luộc, 100g ức gà, 1 quả chuối và 1 ly sữa bao nhiêu calo?", 10))
                .containsExactly("Gạo tẻ", "Trứng gà", "Ức gà", "Chuối", "Sữa tươi không đường");
    }

    @Test
    void theLongestTermWins() {
        assertThat(matcher.find("1 hộp sữa chua", 10)).containsExactly("Sữa chua không đường");
    }

    @Test
    void wholeWordsWithDiacriticsOnly() {
        assertThat(matcher.find("Đi bơi có giúp giảm mỡ không?", 10)).isEmpty();   // "bơ" inside "bơi"
        assertThat(matcher.find("100g bò bao nhiêu đạm?", 10)).containsExactly("Thịt bò");   // not "Bơ"
        assertThat(matcher.find("1 quả bơ", 10)).containsExactly("Bơ");
    }

    @Test
    void aQuestionWithoutDiacriticsMatchesUnambiguousTerms() {
        assertThat(matcher.find("200g com, 1 qua trung luoc, 100g uc ga, 1 qua chuoi va 1 ly sua tuoi", 10))
                .containsExactly("Gạo tẻ", "Trứng gà", "Ức gà", "Chuối", "Sữa tươi không đường");
    }

    @Test
    void withoutDiacriticsAmbiguousOrShortTermsAreLeftToTheSemanticSearch() {
        assertThat(matcher.find("100g bo bao nhieu dam", 10)).isEmpty();   // bơ or bò
        assertThat(matcher.find("thit ga", 10)).isEmpty();                 // "ga": under 3 letters
    }

    @Test
    void oneDiacriticMeansTheUserTypesThemSoNoPlainMatching() {
        assertThat(matcher.find("200g com và chuoi", 10)).isEmpty();
    }

    @Test
    void caseAndUnicodeFormDoNotMatter() {
        String decomposed = Normalizer.normalize("CƠM TRẮNG với CHUỐI", Normalizer.Form.NFD);
        assertThat(matcher.find(decomposed, 10)).containsExactly("Gạo tẻ", "Chuối");
    }

    @Test
    void sameFoodTwiceIsOneFoodAndTheLimitHolds() {
        assertThat(matcher.find("cơm, cơm nữa, trứng, chuối", 2)).containsExactly("Gạo tẻ", "Trứng gà");
    }
}
