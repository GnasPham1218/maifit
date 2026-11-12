package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.ai.entity.AiFeature;
import dev.gnaspham1218.maifit.backend.ai.service.AiUsageService;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatReplyResponse;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatSource;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatMessage;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import dev.gnaspham1218.maifit.backend.chat.ingest.RagChunker;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.config.ChatProperties;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * One question, end to end. The order of the steps is the security design:
 * cheap checks first, the retrieval gate before any quota is spent, the model last,
 * and its answer checked by code before anything is saved or shown.
 * Logs never contain the question or the answer (users may write about their health).
 */
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ChatRetriever retriever;
    private final ChatPromptBuilder promptBuilder;
    private final ChatAnswerer answerer;
    private final ModelAnswerValidator validator;
    private final ChatHistoryService history;
    private final AiUsageService aiUsageService;
    private final JsonMapper jsonMapper;
    private final ChatProperties properties;

    public ChatReplyResponse ask(Long userId, Long conversationId, String rawQuestion) {
        // 1. Length check (the controller validates too; this is the second line)
        String question = rawQuestion == null ? "" : rawQuestion.strip();
        if (question.isEmpty() || question.length() > properties.maxQuestionChars()) {
            throw new AppException(ErrorCode.VALIDATION_FAILED,
                    "A question must have 1 to " + properties.maxQuestionChars() + " characters");
        }

        // 2. Ownership + context: 404 for someone else's conversation, before any AI work
        List<ChatMessage> recent = conversationId == null
                ? List.of()
                : history.recentMessages(conversationId, userId, properties.historyMessages());

        // 3. Retrieval gate (Ollama). Nothing relevant: refuse by code, no quota, no Gemini call
        List<Document> chunks;
        try {
            chunks = retriever.retrieve(question);
        } catch (RuntimeException e) {
            log.error("Chat retrieval failed for user {}", userId, e);
            throw new AppException(ErrorCode.AI_UNAVAILABLE);
        }
        if (chunks.isEmpty()) {
            return save(userId, conversationId, question, ValidatedAnswer.declined(ChatOutcome.NO_INFO),
                    chunks, null);
        }

        // 4. Spend one call of today's quota (429 when none left)
        int remaining = aiUsageService.acquire(userId, AiFeature.CHAT);

        // 5. Ask the model; a failed call gives the quota back
        ModelAnswer raw;
        try {
            raw = answerer.answer(promptBuilder.systemPrompt(), promptBuilder.userPrompt(recent, chunks, question));
        } catch (RuntimeException e) {
            aiUsageService.refund(userId, AiFeature.CHAT);
            log.error("Chat model call failed for user {}", userId, e);
            throw new AppException(ErrorCode.AI_UNAVAILABLE);
        }

        // 6. Code decides what is shown (outside the try: a bug here must not refund nor hide as "AI unavailable")
        ValidatedAnswer checked = validator.validate(raw, chunks.size());
        return save(userId, conversationId, question, checked, chunks, remaining);
    }

    private ChatReplyResponse save(Long userId, Long conversationId, String question, ValidatedAnswer checked,
                                   List<Document> chunks, Integer remaining) {
        List<ChatSource> sources = sources(checked, chunks);
        String sourcesJson = sources.isEmpty() ? null : jsonMapper.writeValueAsString(sources);
        Long savedId = history.saveExchange(userId, conversationId, question,
                checked.outcome(), checked.answer(), sourcesJson);

        log.info("Chat user={} conversation={} outcome={} chunks={} topScore={}",
                userId, savedId, checked.outcome(), chunks.size(),
                chunks.isEmpty() ? null : chunks.get(0).getScore());
        return new ChatReplyResponse(savedId, checked.outcome(), checked.answer(), sources, remaining);
    }

    /** The cited chunks as sources, one per (url, section), in citation order. */
    static List<ChatSource> sources(ValidatedAnswer checked, List<Document> chunks) {
        Map<String, ChatSource> unique = new LinkedHashMap<>();
        for (int index : checked.citedChunks()) {
            Map<String, Object> meta = chunks.get(index).getMetadata();
            ChatSource source = new ChatSource(
                    Objects.toString(meta.get(RagChunker.TITLE), ""),
                    Objects.toString(meta.get(RagChunker.SECTION), ""),
                    Objects.toString(meta.get(RagChunker.URL), ""));
            unique.putIfAbsent(source.url() + "#" + source.section(), source);
        }
        return new ArrayList<>(unique.values());
    }
}
