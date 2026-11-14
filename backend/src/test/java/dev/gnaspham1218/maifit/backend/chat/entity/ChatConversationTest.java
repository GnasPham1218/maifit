package dev.gnaspham1218.maifit.backend.chat.entity;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

// Plain unit test of the title rule (no Spring context, no database)
class ChatConversationTest {

    @Test
    void shortQuestionIsKeptAsIs() {
        assertThat(ChatConversation.titleOf("  Nên ăn bao nhiêu đạm?  ")).isEqualTo("Nên ăn bao nhiêu đạm?");
    }

    @Test
    void lineBreaksAndRepeatedSpacesBecomeOneSpace() {
        assertThat(ChatConversation.titleOf("Ăn gì\n\ntrước   khi tập?")).isEqualTo("Ăn gì trước khi tập?");
    }

    @Test
    void longQuestionIsCutAtAWordBoundary() {
        String question = "Tôi nam 24 tuổi nặng 70 kg tập tạ 4 buổi mỗi tuần muốn giảm mỡ nhưng giữ cơ thì nên ăn bao nhiêu đạm";

        String title = ChatConversation.titleOf(question);

        assertThat(title).endsWith("…");
        assertThat(title.length()).isLessThanOrEqualTo(ChatConversation.TITLE_LENGTH + 1);
        assertThat(question).startsWith(title.substring(0, title.length() - 1));
        assertThat(question.charAt(title.length() - 1)).isEqualTo(' ');   // the cut falls just before a space
    }

    @Test
    void oneVeryLongWordIsCutInTheMiddle() {
        String title = ChatConversation.titleOf("a".repeat(100));

        assertThat(title).isEqualTo("a".repeat(ChatConversation.TITLE_LENGTH) + "…");
    }
}
