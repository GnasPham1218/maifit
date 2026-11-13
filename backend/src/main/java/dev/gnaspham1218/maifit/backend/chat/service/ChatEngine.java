package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatMessage;
import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Decides the reply to one question, without saving anything. Shared by ChatService (real users:
 * real quota, history saved) and the chat-eval profile (test questions: no quota, nothing saved),
 * so the evaluation always runs exactly the production logic.
 * The order of the steps is the security design: health questions refused in code first, the
 * retrieval gate before any quota is spent, the model last, and its answer checked by code.
 */
@Component
@RequiredArgsConstructor
public class ChatEngine {

    /** How a caller pays for a model call. */
    public interface Quota {
        /** Called just before the model; throws when nothing is left. Returns the calls left, or null. */
        Integer acquire();

        /** Called when the model call failed, so it is not charged. */
        void refund();
    }

    /** For the evaluation: model calls are not counted. */
    public static final Quota UNLIMITED = new Quota() {
        @Override
        public Integer acquire() {
            return null;
        }

        @Override
        public void refund() {
        }
    };

    private static final Logger log = LoggerFactory.getLogger(ChatEngine.class);

    private final ChatRetriever retriever;
    private final ChatPromptBuilder promptBuilder;
    private final ChatAnswerer answerer;
    private final ModelAnswerValidator validator;
    private final MedicalQuestionGuard medicalGuard;

    /**
     * @param question a question already stripped and length-checked
     * @param history  earlier messages of the conversation, oldest first (may be empty)
     * @param caller   who asks, for error logs only (e.g. "user 7"); never the question itself
     */
    public ChatDecision decide(String question, List<ChatMessage> history, Quota quota, String caller) {
        // 1. Health questions are refused by code: no retrieval, no quota, no model
        if (medicalGuard.isMedical(question)) {
            return new ChatDecision(ValidatedAnswer.declined(ChatOutcome.MEDICAL), List.of(), null, null, null);
        }

        // 2. Retrieval gate (Ollama). Nothing relevant: refuse by code, no quota, no model
        long started = System.nanoTime();
        List<Document> chunks;
        try {
            chunks = retriever.retrieve(question);
        } catch (RuntimeException e) {
            log.error("Chat retrieval failed for {}", caller, e);
            throw new AppException(ErrorCode.AI_UNAVAILABLE);
        }
        long retrievalMs = millisSince(started);
        if (chunks.isEmpty()) {
            return new ChatDecision(ValidatedAnswer.declined(ChatOutcome.NO_INFO), chunks, null, retrievalMs, null);
        }

        // 3. Pay for the model call (a real user: one call of today's quota, 429 when none left)
        Integer remaining = quota.acquire();

        // 4. Ask the model (bounded by app.chat.model-timeout); a failed or timed-out call is refunded
        started = System.nanoTime();
        ModelAnswer raw;
        try {
            raw = answerer.answer(promptBuilder.systemPrompt(), promptBuilder.userPrompt(history, chunks, question));
        } catch (RuntimeException e) {
            quota.refund();
            log.error("Chat model call failed for {} after {} ms", caller, millisSince(started), e);
            throw new AppException(ErrorCode.AI_UNAVAILABLE);
        }
        long modelMs = millisSince(started);

        // 5. Code decides what is shown (outside the try: a bug here must not refund nor hide as "AI unavailable")
        return new ChatDecision(validator.validate(raw, chunks.size()), chunks, remaining, retrievalMs, modelMs);
    }

    private static long millisSince(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000;
    }
}
