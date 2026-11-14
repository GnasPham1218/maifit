package dev.gnaspham1218.maifit.backend.ai.dto;

import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;

/**
 * Tokens of one model call, as billed.
 *
 * @param input  prompt tokens (text + image)
 * @param output everything generated, thinking included: Google bills thinking tokens as output.
 *               Taken as total - input, because the "completion" count may leave the thinking out.
 */
public record TokenUsage(long input, long output) {

    public static final TokenUsage NONE = new TokenUsage(0, 0);

    public static TokenUsage from(ChatResponse response) {
        if (response == null || response.getMetadata() == null) {
            return NONE;
        }
        Usage usage = response.getMetadata().getUsage();
        if (usage == null) {
            return NONE;
        }
        long input = orZero(usage.getPromptTokens());
        long completion = orZero(usage.getCompletionTokens());
        long total = orZero(usage.getTotalTokens());
        return new TokenUsage(input, Math.max(completion, total - input));
    }

    private static long orZero(Integer value) {
        return value == null ? 0 : value;
    }
}
