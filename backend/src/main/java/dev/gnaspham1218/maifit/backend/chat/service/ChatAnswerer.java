package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.config.ChatProperties;
import jakarta.annotation.PreDestroy;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
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
 * Every call is bounded by app.chat.model-timeout. Spring AI 2.0.2 documents no timeout property for
 * Google GenAI, and Nginx gives up after 60 s: without a bound, a slow reply would be charged to the
 * user while they only see a 504. With it, ChatService refunds the call and answers 503.
 */
@Component
public class ChatAnswerer {

    private final ChatClient chatClient;
    private final Duration timeout;
    // A virtual thread per call: waiting on Gemini costs almost nothing
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public ChatAnswerer(ChatModel chatModel, ChatProperties properties) {
        this.chatClient = ChatClient.builder(chatModel).build();
        this.timeout = properties.modelTimeout();
    }

    /** entity() asks for JSON matching ModelAnswer and parses it; it throws if the reply is not valid JSON. */
    public ModelAnswer answer(String systemPrompt, String userPrompt) {
        return callWithTimeout(executor, () -> chatClient.prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call()
                .entity(ModelAnswer.class), timeout);
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
