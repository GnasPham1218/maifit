package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatConversation;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatMessage;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import dev.gnaspham1218.maifit.backend.chat.repository.ChatConversationRepository;
import dev.gnaspham1218.maifit.backend.chat.repository.ChatMessageRepository;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Reads and writes chat history. The only chat class with transactions, and they stay short:
 * nothing here calls Ollama or Gemini, so no database connection is held during an AI call.
 */
@Service
@RequiredArgsConstructor
public class ChatHistoryService {

    private final ChatConversationRepository conversations;
    private final ChatMessageRepository messages;

    /** The last messages of a conversation of this user, oldest first. 404 if it is not theirs. */
    @Transactional(readOnly = true)
    public List<ChatMessage> recentMessages(Long conversationId, Long userId, int limit) {
        requireOwned(conversationId, userId);
        List<ChatMessage> latest = new ArrayList<>(
                messages.findByConversationIdOrderByCreatedAtDescIdDesc(conversationId, Limit.of(limit)));
        Collections.reverse(latest);
        return latest;
    }

    /**
     * Saves one question and its reply. Creates the conversation when conversationId is null.
     * Ownership is checked again here: the conversation may have been deleted during the AI call.
     *
     * @return the id of the conversation
     */
    @Transactional
    public Long saveExchange(Long userId, Long conversationId, String question,
                             ChatOutcome outcome, String answer, String sourcesJson) {
        ChatConversation conversation = conversationId == null
                ? conversations.save(new ChatConversation(userId, question))
                : requireOwned(conversationId, userId);
        conversation.touch();   // dirty checking writes updated_at at commit
        messages.save(ChatMessage.question(conversation.getId(), question));
        messages.save(ChatMessage.answer(conversation.getId(), outcome, answer, sourcesJson));
        return conversation.getId();
    }

    private ChatConversation requireOwned(Long conversationId, Long userId) {
        return conversations.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Conversation not found"));
    }
}
