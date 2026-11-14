package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.ai.dto.TokenUsage;
import dev.gnaspham1218.maifit.backend.config.ChatProperties;
import jakarta.annotation.PreDestroy;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.ResponseEntity;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.google.genai.common.GoogleGenAiThinkingLevel;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * The only class that calls the chat model. Kept apart so ChatService can be tested without Gemini.
 * The model gets no tools: whatever a question makes it say, it cannot read or change anything.
 *
 * Calls use app.chat.thinking-level and app.chat.max-output-tokens for this request only
 * (photo recognition sets its own, see app.ai.food-vision).
 * Unset, Gemini 3 sometimes "thought" for over 30 s or cut its JSON short: 10/15 in the chat-eval
 * set; LOW gave 14/15 and 15/15 (2026-11-13).
 *
 * Every call is bounded by app.chat.model-timeout. Spring AI 2.0.2 documents no timeout property for
 * Google GenAI, and Nginx gives up after 60 s: without a bound, a slow reply would be charged to the
 * user while they only see a 504. With it, ChatService refunds the call and answers 503.
 */
@Component
public class ChatAnswerer {

    private final ChatClient chatClient;
    private final GoogleGenAiThinkingLevel thinkingLevel;
    private final Duration timeout;
    private final int maxOutputTokens;
    private final String model;
    // A virtual thread per call: waiting on Gemini costs almost nothing
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public ChatAnswerer(ChatModel chatModel, ChatProperties properties) {
        this.chatClient = ChatClient.builder(chatModel).build();
        this.thinkingLevel = properties.thinkingLevel();
        this.timeout = properties.modelTimeout();
        this.maxOutputTokens = properties.maxOutputTokens();
        this.model = properties.model();
    }

    /**
     * responseEntity() asks for JSON matching ModelAnswer and parses it (it throws if the reply is not valid
     * JSON), and keeps the raw response for its token usage.
     */
    public ModelReply answer(String systemPrompt, String userPrompt) {
        return callWithTimeout(executor, () -> {
            ResponseEntity<ChatResponse, ModelAnswer> result = chatClient.prompt()
                    // In Spring AI 2.0.2 options() takes a builder (not built options). A new one per call: builders
                    // are mutable and calls run in parallel. Only the fields set here override application.yaml,
                    // so the model name stays as configured.
                    .options(chatOptions())
                    .system(systemPrompt)
                    .user(userPrompt)
                    .call()
                    .responseEntity(ModelAnswer.class);
            return new ModelReply(result.entity(), TokenUsage.from(result.response()));
        }, timeout);
    }

    // Only the fields set here override application.yaml. The model is set only when app.chat.model is given,
    // so chat can run on a cheaper model than photo recognition (both share the same ChatModel bean).
    private GoogleGenAiChatOptions.Builder chatOptions() {
        GoogleGenAiChatOptions.Builder options = GoogleGenAiChatOptions.builder()
                .thinkingLevel(thinkingLevel)
                .maxOutputTokens(maxOutputTokens);
        if (model != null && !model.isBlank()) {
            options.model(model);
        }
        return options;
    }

    /**
     * Runs the call on another thread and stops waiting after the timeout. The HTTP request itself may
     * still finish in the background; its reply is dropped. Errors of the call are rethrown as they are.
     */
    static <T> T callWithTimeout(ExecutorService executor, Callable<T> call, Duration timeout) {
        Future<T> future = executor.submit(call);
        try {
            return future.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new IllegalStateException("Chat model call timed out after " + timeout, e);
        } catch (ExecutionException e) {
            if (e.getCause() instanceof RuntimeException runtime) {
                throw runtime;
            }
            throw new IllegalStateException("Chat model call failed", e.getCause());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for the chat model", e);
        }
    }

    @PreDestroy
    void close() {
        executor.shutdownNow();
    }
}
