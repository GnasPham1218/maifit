package dev.gnaspham1218.maifit.backend.config;

import org.springframework.ai.google.genai.common.GoogleGenAiThinkingLevel;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

// Bound from application.yaml -> app.chat.*  (the daily quota is app.ai.daily-limit.chat)
@ConfigurationProperties(prefix = "app.chat")
public record ChatProperties(
        int maxQuestionChars,        // longer questions are rejected before anything is called
        int topK,                    // chunks retrieved and sent to the model
        double similarityThreshold,  // retrieval gate: below this score a chunk does not count
        int historyMessages,         // previous messages of the conversation sent back as context
        Duration modelTimeout,       // a model call slower than this is abandoned and refunded
        GoogleGenAiThinkingLevel thinkingLevel   // how long Gemini 3 may "think" before answering a chat question
) {
}
