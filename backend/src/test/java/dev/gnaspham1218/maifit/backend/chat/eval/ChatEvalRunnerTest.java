package dev.gnaspham1218.maifit.backend.chat.eval;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import dev.gnaspham1218.maifit.backend.chat.ingest.RagChunker;
import dev.gnaspham1218.maifit.backend.chat.service.ChatDecision;
import dev.gnaspham1218.maifit.backend.chat.service.ValidatedAnswer;
import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

// The PASS/FAIL rules of the evaluation (no AI: decisions are built by hand)
class ChatEvalRunnerTest {

    private static final Document CHUNK = Document.builder().text("x")
            .metadata(Map.of(RagChunker.TITLE, "Protein", RagChunker.SECTION, "Recommended intake > Key points",
                    RagChunker.URL, "https://a"))
            .build();

    private static ChatEvalCase answered(String section) {
        return new ChatEvalCase(1, EnumSet.of(ChatOutcome.ANSWERED), "q", section, "");
    }

    private static ChatDecision answer(String text) {
        return new ChatDecision(new ValidatedAnswer(ChatOutcome.ANSWERED, text, List.of(0)), List.of(CHUNK), null, 1L, 1L);
    }

    @Test
    void aGoodAnswerPasses() {
        assertThat(ChatEvalRunner.check(answered("recommended intake"), answer("Khoảng 1,6 g/kg mỗi ngày."))).isNull();
    }

    @Test
    void anAnswerWithoutDiacriticsFails() {
        assertThat(ChatEvalRunner.check(answered(""), answer("Khoang 1,6 g/kg moi ngay."))).contains("diacritics");
    }

    @Test
    void anAnswerWithAnHtmlTagFails() {
        assertThat(ChatEvalRunner.check(answered(""), answer("Có <script>alert(1)</script>"))).contains("HTML");
    }

    @Test
    void theWrongSourceFails() {
        assertThat(ChatEvalRunner.check(answered("Safety"), answer("Có, tăng cơ."))).contains("Safety");
    }

    @Test
    void anUnexpectedOutcomeFails() {
        ChatEvalCase medical = new ChatEvalCase(1, EnumSet.of(ChatOutcome.MEDICAL), "q", "", "");

        assertThat(ChatEvalRunner.check(medical, answer("Có dấu."))).contains("ANSWERED");
    }
}
