package dev.gnaspham1218.maifit.backend.chat.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Component;

/**
 * The only class that calls the chat model. Kept apart so ChatService can be tested without Gemini.
 * The model gets no tools: whatever a question makes it say, it cannot read or change anything.
 */
@Component
public class ChatAnswerer {

    private final ChatClient chatClient;

    public ChatAnswerer(ChatModel chatModel) {
        this.chatClient = ChatClient.builder(chatModel).build();
    }

    /** entity() asks for JSON matching ModelAnswer and parses it; it throws if the reply is not valid JSON. */
    public ModelAnswer answer(String systemPrompt, String userPrompt) {
        return chatClient.prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call()
                .entity(ModelAnswer.class);
    }
}
