package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.dto.ChatMessageResponse;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatConversation;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatMessage;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatRole;
import dev.gnaspham1218.maifit.backend.chat.repository.ChatConversationRepository;
import dev.gnaspham1218.maifit.backend.chat.repository.ChatMessageRepository;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Limit;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Ownership and the shape of the history (no database: repositories are mocked)
class ChatHistoryServiceTest {

    private static final long OWNER = 7L;
    private static final long OTHER_USER = 8L;
    private static final long CONVERSATION = 12L;

    private ChatConversationRepository conversations;
    private ChatMessageRepository messages;
    private ChatHistoryService service;

    @BeforeEach
    void setUp() {
        conversations = mock(ChatConversationRepository.class);
        messages = mock(ChatMessageRepository.class);
        service = new ChatHistoryService(conversations, messages, JsonMapper.builder().build());
        when(conversations.findByIdAndUserId(CONVERSATION, OWNER))
                .thenReturn(Optional.of(new ChatConversation(OWNER, "Nên ăn bao nhiêu đạm?")));
        when(conversations.findByIdAndUserId(CONVERSATION, OTHER_USER)).thenReturn(Optional.empty());
    }

    private static void assertNotFound(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
    }

    @Test
    void anotherUsersConversationIsNotFound() {
        assertNotFound(() -> service.listMessages(CONVERSATION, OTHER_USER));
        assertNotFound(() -> service.recentMessages(CONVERSATION, OTHER_USER, 6));
        verify(messages, never()).findByConversationIdOrderByCreatedAtDescIdDesc(any(), any());
    }

    @Test
    void deletingAnotherUsersConversationIsNotFound() {
        when(conversations.deleteOwned(CONVERSATION, OTHER_USER)).thenReturn(0);

        assertNotFound(() -> service.deleteConversation(CONVERSATION, OTHER_USER));
    }

    @Test
    void messagesComeOldestFirstWithSourcesAndRefusalsWithoutText() {
        String sources = "[{\"title\":\"Protein\",\"section\":\"Recommended intake\",\"url\":\"https://a\"}]";
        // The repository returns the newest first
        when(messages.findByConversationIdOrderByCreatedAtDescIdDesc(CONVERSATION, Limit.of(ChatHistoryService.MAX_MESSAGES)))
                .thenReturn(List.of(
                        ChatMessage.answer(CONVERSATION, ChatOutcome.OUT_OF_SCOPE, "ignored", null),
                        ChatMessage.question(CONVERSATION, "Thủ đô Pháp?"),
                        ChatMessage.answer(CONVERSATION, ChatOutcome.ANSWERED, "Khoảng 1,6 g/kg.", sources),
                        ChatMessage.question(CONVERSATION, "Nên ăn bao nhiêu đạm?")));

        List<ChatMessageResponse> result = service.listMessages(CONVERSATION, OWNER);

        assertThat(result).extracting(ChatMessageResponse::role)
                .containsExactly(ChatRole.USER, ChatRole.ASSISTANT, ChatRole.USER, ChatRole.ASSISTANT);
        assertThat(result.get(1).content()).isEqualTo("Khoảng 1,6 g/kg.");
        assertThat(result.get(1).sources()).singleElement()
                .satisfies(source -> assertThat(source.section()).isEqualTo("Recommended intake"));
        assertThat(result.get(3).outcome()).isEqualTo(ChatOutcome.OUT_OF_SCOPE);
        assertThat(result.get(3).content()).isNull();   // the frontend shows its fixed text
        assertThat(result.get(3).sources()).isEmpty();
    }
}
