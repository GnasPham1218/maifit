package dev.gnaspham1218.maifit.backend.chat.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// The time bound around the model call (no Gemini: the "call" is a plain function)
class ChatAnswererTest {

    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    @AfterEach
    void tearDown() {
        executor.shutdownNow();
    }

    @Test
    void aFastCallReturnsItsResult() {
        String result = ChatAnswerer.callWithTimeout(executor, () -> "ok", Duration.ofSeconds(1));

        assertThat(result).isEqualTo("ok");
    }

    @Test
    void aSlowCallStopsAtTheTimeout() {
        long start = System.nanoTime();

        assertThatThrownBy(() -> ChatAnswerer.callWithTimeout(executor, () -> {
            Thread.sleep(5_000);
            return "too late";
        }, Duration.ofMillis(200)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("timed out");
        assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(2));
    }

    @Test
    void anErrorOfTheCallIsRethrownUnchanged() {
        assertThatThrownBy(() -> ChatAnswerer.callWithTimeout(executor, () -> {
            throw new IllegalArgumentException("Gemini 503");
        }, Duration.ofSeconds(1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Gemini 503");
    }
}
