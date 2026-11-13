package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import dev.gnaspham1218.maifit.backend.chat.ingest.RagChunker;
import dev.gnaspham1218.maifit.backend.chat.ingest.RagFoodChunker;
import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

// The code-side check of the model's answer (layer 5 of the chat security design)
class ModelAnswerValidatorTest {

    private final ModelAnswerValidator validator = new ModelAnswerValidator();

    private static Document doc() {
        return Document.builder().text("guideline").metadata(Map.of(RagChunker.TYPE, RagChunker.TYPE_DOCUMENT)).build();
    }

    private static Document food(String name) {
        return Document.builder().text("Thực phẩm: " + name)
                .metadata(Map.of(RagChunker.TYPE, RagChunker.TYPE_FOOD, RagFoodChunker.FOOD, name)).build();
    }

    private static final List<Document> DOCS = List.of(doc(), doc(), doc());
    // [1] a document, [2] rice, [3] egg
    private static final List<Document> WITH_FOODS = List.of(doc(), food("Gạo tẻ"), food("Trứng gà"));

    @Test
    void acceptsAnAnswerThatCitesExistingExcerpts() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("ANSWERED", "Khoảng 1,4–2,0 g/kg/ngày.", List.of(2, 1, 2)), DOCS);

        assertThat(result.outcome()).isEqualTo(ChatOutcome.ANSWERED);
        assertThat(result.answer()).isEqualTo("Khoảng 1,4–2,0 g/kg/ngày.");
        assertThat(result.citedChunks()).containsExactly(1, 0);   // 0-based, duplicates removed, order kept
    }

    @Test
    void anAnswerWithoutCitationsIsNotShown() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("ANSWERED", "Paris.", List.of()), DOCS);

        assertThat(result.outcome()).isEqualTo(ChatOutcome.NO_INFO);
        assertThat(result.answer()).isNull();
    }

    @Test
    void aCitationOfAMissingExcerptRejectsTheWholeAnswer() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("ANSWERED", "Text.", List.of(1, 7)), DOCS);

        assertThat(result.outcome()).isEqualTo(ChatOutcome.NO_INFO);
    }

    @Test
    void aRefusalNeverCarriesModelText() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("medical", "Hãy uống thuốc X.", List.of(1)), DOCS);

        assertThat(result.outcome()).isEqualTo(ChatOutcome.MEDICAL);
        assertThat(result.answer()).isNull();
        assertThat(result.citedChunks()).isEmpty();
    }

    @Test
    void anUnknownOutcomeOrNoAnswerAtAllIsNoInfo() {
        assertThat(validator.validate(new ModelAnswer("SURE", "x", List.of(1)), DOCS).outcome()).isEqualTo(ChatOutcome.NO_INFO);
        assertThat(validator.validate(null, DOCS).outcome()).isEqualTo(ChatOutcome.NO_INFO);
        assertThat(validator.validate(new ModelAnswer("ANSWERED", "   ", List.of(1)), DOCS).outcome()).isEqualTo(ChatOutcome.NO_INFO);
    }

    @Test
    void inlineExcerptNumbersAreRemovedFromTheText() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("ANSWERED", "Ăn 20–40 g đạm [1]. Trước khi ngủ [2, 3].", List.of(1)), DOCS);

        assertThat(result.answer()).isEqualTo("Ăn 20–40 g đạm. Trước khi ngủ.");
    }

    @Test
    void anAbnormallyLongAnswerIsNotShown() {
        String tooLong = "a".repeat(ModelAnswerValidator.MAX_ANSWER_CHARS + 1);

        assertThat(validator.validate(new ModelAnswer("ANSWERED", tooLong, List.of(1)), DOCS).outcome())
                .isEqualTo(ChatOutcome.NO_INFO);
    }

    @Test
    void keepsPortionsOfFoodExcerptsWithTheFoodNameFromMetadata() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("ANSWERED", "Cơm 130 kcal/100 g.", List.of(1), List.of(
                new ModelPortion(2, "boiled", 200.4, false),
                new ModelPortion(3, null, 50.0, true))), WITH_FOODS);

        assertThat(result.portions()).containsExactly(
                new PortionRequest("Gạo tẻ", Preparation.BOILED, new BigDecimal("200"), false),
                new PortionRequest("Trứng gà", null, new BigDecimal("50"), true));
        assertThat(result.citedChunks()).containsExactly(0, 1, 2);   // foods used are sources too
    }

    @Test
    void dropsBadPortionsButKeepsTheAnswer() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("ANSWERED", "Text.", List.of(1), List.of(
                new ModelPortion(1, "BOILED", 100.0, false),     // a document, not a food
                new ModelPortion(9, "BOILED", 100.0, false),     // no such excerpt
                new ModelPortion(2, "BOILED", 0.0, false),       // no amount
                new ModelPortion(2, "BOILED", 5000.0, false),    // not a portion
                new ModelPortion(2, "MICROWAVED", 100.0, false))), WITH_FOODS);  // unknown preparation: asked

        assertThat(result.outcome()).isEqualTo(ChatOutcome.ANSWERED);
        assertThat(result.portions()).singleElement()
                .satisfies(p -> assertThat(p.preparation()).isNull());
    }

    @Test
    void aRefusalHasNoPortions() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("NO_INFO", "", List.of(), List.of(
                new ModelPortion(2, "BOILED", 100.0, false))), WITH_FOODS);

        assertThat(result.portions()).isEmpty();
    }
}
