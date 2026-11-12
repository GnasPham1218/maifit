package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.ingest.RagChunker;
import dev.gnaspham1218.maifit.backend.config.ChatProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * The retrieval gate. Embeds the question with Ollama and returns the closest document chunks above
 * the similarity threshold. An empty result means the question is answered with a refusal by code:
 * the chat model is never called for it.
 */
@Component
@RequiredArgsConstructor
public class ChatRetriever {

    private static final String DOCUMENTS_ONLY = RagChunker.TYPE + " == '" + RagChunker.TYPE_DOCUMENT + "'";

    private final VectorStore vectorStore;
    private final ChatProperties properties;

    /** Best chunk first. Only the current question is embedded, never the history. */
    public List<Document> retrieve(String question) {
        return vectorStore.similaritySearch(SearchRequest.builder()
                .query(question)
                .topK(properties.topK())
                .similarityThreshold(properties.similarityThreshold())
                .filterExpression(DOCUMENTS_ONLY)
                .build());
    }
}
