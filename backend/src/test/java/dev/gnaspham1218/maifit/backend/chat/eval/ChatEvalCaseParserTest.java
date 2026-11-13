package dev.gnaspham1218.maifit.backend.chat.eval;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChatEvalCaseParserTest {

    @Test
    void readsAllFieldsAndSkipsCommentsAndBlankLines() {
        List<ChatEvalCase> cases = ChatEvalCaseParser.parse("""
                # comment

                ANSWERED | Nên ăn bao nhiêu đạm, mỗi ngày? | Recommended intake
                NO_INFO, OUT_OF_SCOPE | Thủ đô Pháp?
                ANSWERED | Còn trước khi ngủ? | Pre-sleep | Nên ăn bao nhiêu đạm?
                """);

        assertThat(cases).hasSize(3);
        assertThat(cases.get(0).line()).isEqualTo(3);
        assertThat(cases.get(0).question()).isEqualTo("Nên ăn bao nhiêu đạm, mỗi ngày?");   // commas stay in the question
        assertThat(cases.get(0).sourceSection()).isEqualTo("Recommended intake");
        assertThat(cases.get(1).expected()).containsExactlyInAnyOrder(ChatOutcome.NO_INFO, ChatOutcome.OUT_OF_SCOPE);
        assertThat(cases.get(1).sourceSection()).isEmpty();
        assertThat(cases.get(2).previousQuestion()).isEqualTo("Nên ăn bao nhiêu đạm?");
    }

    @Test
    void anUnknownOutcomeNamesTheLine() {
        assertThatThrownBy(() -> ChatEvalCaseParser.parse("ANSWER | Hỏi?"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("line 1");
    }
}
