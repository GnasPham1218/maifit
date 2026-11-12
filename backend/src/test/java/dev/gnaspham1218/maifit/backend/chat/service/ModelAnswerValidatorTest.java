package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// The code-side check of the model's answer (layer 5 of the chat security design)
class ModelAnswerValidatorTest {

    private final ModelAnswerValidator validator = new ModelAnswerValidator();

    @Test
    void acceptsAnAnswerThatCitesExistingExcerpts() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("ANSWERED", "Khoảng 1,4–2,0 g/kg/ngày.", List.of(2, 1, 2)), 3);

        assertThat(result.outcome()).isEqualTo(ChatOutcome.ANSWERED);
        assertThat(result.answer()).isEqualTo("Khoảng 1,4–2,0 g/kg/ngày.");
        assertThat(result.citedChunks()).containsExactly(1, 0);   // 0-based, duplicates removed, order kept
    }

    @Test
    void anAnswerWithoutCitationsIsNotShown() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("ANSWERED", "Paris.", List.of()), 3);

        assertThat(result.outcome()).isEqualTo(ChatOutcome.NO_INFO);
        assertThat(result.answer()).isNull();
    }

    @Test
    void aCitationOfAMissingExcerptRejectsTheWholeAnswer() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("ANSWERED", "Text.", List.of(1, 7)), 3);

        assertThat(result.outcome()).isEqualTo(ChatOutcome.NO_INFO);
    }

    @Test
    void aRefusalNeverCarriesModelText() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("medical", "Hãy uống thuốc X.", List.of(1)), 3);

        assertThat(result.outcome()).isEqualTo(ChatOutcome.MEDICAL);
        assertThat(result.answer()).isNull();
        assertThat(result.citedChunks()).isEmpty();
    }

    @Test
    void anUnknownOutcomeOrNoAnswerAtAllIsNoInfo() {
        assertThat(validator.validate(new ModelAnswer("SURE", "x", List.of(1)), 3).outcome()).isEqualTo(ChatOutcome.NO_INFO);
        assertThat(validator.validate(null, 3).outcome()).isEqualTo(ChatOutcome.NO_INFO);
        assertThat(validator.validate(new ModelAnswer("ANSWERED", "   ", List.of(1)), 3).outcome()).isEqualTo(ChatOutcome.NO_INFO);
    }

    @Test
    void inlineExcerptNumbersAreRemovedFromTheText() {
        ValidatedAnswer result = validator.validate(new ModelAnswer("ANSWERED", "Ăn 20–40 g đạm [1]. Trước khi ngủ [2, 3].", List.of(1)), 3);

        assertThat(result.answer()).isEqualTo("Ăn 20–40 g đạm. Trước khi ngủ.");
    }

    @Test
    void anAbnormallyLongAnswerIsNotShown() {
        String tooLong = "a".repeat(ModelAnswerValidator.MAX_ANSWER_CHARS + 1);

        assertThat(validator.validate(new ModelAnswer("ANSWERED", tooLong, List.of(1)), 3).outcome())
                .isEqualTo(ChatOutcome.NO_INFO);
    }
}
