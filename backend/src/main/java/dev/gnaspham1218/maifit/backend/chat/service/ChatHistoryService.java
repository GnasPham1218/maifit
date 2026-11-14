package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.dto.ChatCalcItemRequest;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatCalculation;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatConversationResponse;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatMessageResponse;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatSource;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatConversation;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatMessage;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatRole;
import dev.gnaspham1218.maifit.backend.chat.repository.ChatConversationRepository;
import dev.gnaspham1218.maifit.backend.chat.repository.ChatMessageRepository;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Reads and writes chat history. The only chat class with transactions, and they stay short:
 * nothing here calls Ollama or Gemini, so no database connection is held during an AI call.
 * Every method that takes a conversation id checks it belongs to the user: someone else's
 * conversation is "not found" (404), never "forbidden", so ids cannot be probed (IDOR).
 */
@Service
@RequiredArgsConstructor
public class ChatHistoryService {

    static final int MAX_CONVERSATIONS = 50;   // the list shows the latest ones only
    static final int MAX_MESSAGES = 200;       // a very long conversation shows its latest messages only
    private static final TypeReference<List<ChatSource>> SOURCES = new TypeReference<>() {
    };

    private final ChatConversationRepository conversations;
    private final ChatMessageRepository messages;
    private final JsonMapper jsonMapper;
    private final ChatPortionCalculator calculator;

    // ---------- used by the chat itself ----------

    /** The last messages of a conversation of this user, oldest first. */
    @Transactional(readOnly = true)
    public List<ChatMessage> recentMessages(Long conversationId, Long userId, int limit) {
        requireOwned(conversationId, userId);
        return latestFirstReversed(conversationId, limit);
    }

    /**
     * Saves one question and its reply. Creates the conversation when conversationId is null.
     * Ownership is checked again here: the conversation may have been deleted during the AI call.
     *
     * @return the ids of the conversation and of the reply
     */
    @Transactional
    public SavedExchange saveExchange(Long userId, Long conversationId, String question, ChatOutcome outcome,
                                      String answer, String sourcesJson, String calculationJson) {
        ChatConversation conversation = conversationId == null
                ? conversations.save(new ChatConversation(userId, question))
                : requireOwned(conversationId, userId);
        conversation.touch();   // dirty checking writes updated_at at commit
        messages.save(ChatMessage.question(conversation.getId(), question));
        ChatMessage reply = messages.save(
                ChatMessage.answer(conversation.getId(), outcome, answer, sourcesJson, calculationJson));
        return new SavedExchange(conversation.getId(), reply.getId());
    }

    /**
     * The user corrected the calculation under an answer (preparation, food, grams, remove, add).
     * Code recalculates from the foods table: no AI call, no quota. Someone else's message is "not found".
     *
     * @return the new calculation, or null when the list is empty
     */
    @Transactional
    public ChatCalculation updateCalculation(Long messageId, Long userId, List<ChatCalcItemRequest> items) {
        ChatMessage message = messages.findById(messageId).orElseThrow(ChatHistoryService::notFound);
        requireOwned(message.getConversationId(), userId);
        if (message.getRole() != ChatRole.ASSISTANT || message.getOutcome() != ChatOutcome.ANSWERED) {
            throw notFound();   // only an answer can carry a calculation
        }
        ChatCalculation updated = calculator.recalculate(items.stream()
                .map(i -> new PortionRequest(i.food(), i.preparation(), i.grams(), i.estimated()))
                .toList());
        message.updateCalculation(updated == null ? null : jsonMapper.writeValueAsString(updated));
        return updated;
    }

    // ---------- used by the history endpoints ----------

    /** The user's latest conversations, most recently used first. */
    @Transactional(readOnly = true)
    public List<ChatConversationResponse> listConversations(Long userId) {
        return conversations.findByUserIdOrderByUpdatedAtDesc(userId, Limit.of(MAX_CONVERSATIONS)).stream()
                .map(c -> new ChatConversationResponse(c.getId(), c.getTitle(), c.getCreatedAt(), c.getUpdatedAt()))
                .toList();
    }

    /** Messages of one conversation of this user, oldest first. */
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> listMessages(Long conversationId, Long userId) {
        requireOwned(conversationId, userId);
        return latestFirstReversed(conversationId, MAX_MESSAGES).stream().map(this::toResponse).toList();
    }

    /** Deletes a conversation of this user and its messages (ON DELETE CASCADE). */
    @Transactional
    public void deleteConversation(Long conversationId, Long userId) {
        if (conversations.deleteOwned(conversationId, userId) == 0) {
            throw notFound();
        }
    }

    // ---------- helpers ----------

    private List<ChatMessage> latestFirstReversed(Long conversationId, int limit) {
        List<ChatMessage> latest = new ArrayList<>(
                messages.findByConversationIdOrderByCreatedAtDescIdDesc(conversationId, Limit.of(limit)));
        Collections.reverse(latest);
        return latest;
    }

    private ChatMessageResponse toResponse(ChatMessage message) {
        boolean declined = message.getRole() == ChatRole.ASSISTANT && message.getContent().isEmpty();
        List<ChatSource> sources = message.getSources() == null
                ? List.of()
                : jsonMapper.readValue(message.getSources(), SOURCES);
        ChatCalculation calculation = message.getCalculation() == null
                ? null
                : jsonMapper.readValue(message.getCalculation(), ChatCalculation.class);
        return new ChatMessageResponse(message.getId(), message.getRole(), declined ? null : message.getContent(),
                message.getOutcome(), sources, calculation, message.getCreatedAt());
    }

    private ChatConversation requireOwned(Long conversationId, Long userId) {
        return conversations.findByIdAndUserId(conversationId, userId).orElseThrow(ChatHistoryService::notFound);
    }

    private static AppException notFound() {
        return new AppException(ErrorCode.NOT_FOUND, "Conversation not found");
    }
}
