package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.ai.entity.AiFeature;
import dev.gnaspham1218.maifit.backend.ai.service.AiUsageService;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatReplyResponse;
import dev.gnaspham1218.maifit.backend.chat.dto.ChatSource;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatMessage;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.config.ChatProperties;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

/**
 * One question of a real user: input checks, ownership, the decision (ChatEngine) with the user's
 * daily quota, then the history. Logs never contain the question or the answer (users may write
 * about their health).
 */
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ChatEngine engine;
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

        // 3. The decision, paid with this user's daily chat quota
        ChatDecision decision = engine.decide(question, recent, quotaOf(userId), "user " + userId);

        // 4. Save the exchange, after every AI call (no transaction is held during them)
        List<ChatSource> sources = decision.sources();
        String sourcesJson = sources.isEmpty() ? null : jsonMapper.writeValueAsString(sources);
        ValidatedAnswer answer = decision.answer();
        Long savedId = history.saveExchange(userId, conversationId, question,
                answer.outcome(), answer.answer(), sourcesJson);

        log.info("Chat user={} conversation={} outcome={} chunks={} topScore={} retrievalMs={} modelMs={}",
                userId, savedId, answer.outcome(), decision.chunks().size(), decision.topScore(),
                decision.retrievalMs(), decision.modelMs());
        return new ChatReplyResponse(savedId, answer.outcome(), answer.answer(), sources, decision.remainingToday());
    }

    private ChatEngine.Quota quotaOf(Long userId) {
        return new ChatEngine.Quota() {
            @Override
            public Integer acquire() {
                return aiUsageService.acquire(userId, AiFeature.CHAT);
            }

            @Override
            public void refund() {
                aiUsageService.refund(userId, AiFeature.CHAT);
            }
        };
    }
}
