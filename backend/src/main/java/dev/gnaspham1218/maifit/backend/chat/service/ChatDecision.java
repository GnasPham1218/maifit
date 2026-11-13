package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.dto.ChatSource;
import dev.gnaspham1218.maifit.backend.chat.ingest.RagChunker;
import org.springframework.ai.document.Document;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * What ChatEngine decided for one question.
 *
 * @param chunks         the retrieved chunks (empty when refused before retrieval or by the gate)
 * @param remainingToday what the quota reported, or null when the model was not called
 * @param retrievalMs    null when retrieval did not run
 * @param modelMs        null when the model was not called
 */
public record ChatDecision(ValidatedAnswer answer, List<Document> chunks, Integer remainingToday,
                           Long retrievalMs, Long modelMs) {

    /** The cited chunks as sources, one per (url, section), in citation order. */
    public List<ChatSource> sources() {
        Map<String, ChatSource> unique = new LinkedHashMap<>();
        for (int index : answer.citedChunks()) {
            Map<String, Object> meta = chunks.get(index).getMetadata();
            ChatSource source = new ChatSource(
                    Objects.toString(meta.get(RagChunker.TITLE), ""),
                    Objects.toString(meta.get(RagChunker.SECTION), ""),
                    Objects.toString(meta.get(RagChunker.URL), ""));
            unique.putIfAbsent(source.url() + "#" + source.section(), source);
        }
        return new ArrayList<>(unique.values());
    }

    public Double topScore() {
        return chunks.isEmpty() ? null : chunks.get(0).getScore();
    }
}
