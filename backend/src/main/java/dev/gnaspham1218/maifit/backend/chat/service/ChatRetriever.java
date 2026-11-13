package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.ingest.RagChunker;
import dev.gnaspham1218.maifit.backend.chat.ingest.RagFoodChunker;
import dev.gnaspham1218.maifit.backend.config.ChatProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The retrieval gate. Embeds the question with Ollama and returns the closest document and food chunks
 * above their similarity thresholds. An empty result means the question is answered with a refusal by code:
 * the chat model is never called for it.
 */
@Component
@RequiredArgsConstructor
public class ChatRetriever {

    private static final String DOCUMENTS_ONLY = RagChunker.TYPE + " == '" + RagChunker.TYPE_DOCUMENT + "'";
    private static final String FOODS_ONLY = RagChunker.TYPE + " == '" + RagChunker.TYPE_FOOD + "'";

    /** Same as ModelAnswerValidator.MAX_PORTIONS: more foods could not be calculated anyway. */
    static final int MAX_FOODS = ModelAnswerValidator.MAX_PORTIONS;

    private final VectorStore vectorStore;
    private final ChatProperties properties;
    private final FoodNames foodNames;

    /**
     * Documents first (best first), then foods. The two groups are searched separately, each with its own
     * top-k and threshold: food chunks are short and score differently, and searched together one group
     * could take every place ("how much protein per day" filled with high-protein foods, no guideline).
     * Only the current question is embedded, never the history.
     */
    public List<Document> retrieve(String question) {
        List<Document> chunks = new ArrayList<>(search(question, properties.topK(),
                properties.similarityThreshold(), DOCUMENTS_ONLY));
        chunks.addAll(foods(question));
        return chunks;
    }

    /**
     * Hybrid: foods named in the question (exact, in question order), then the closest foods by meaning
     * (typos, no diacritics, other wording). One chunk per food, at most MAX_FOODS.
     */
    private List<Document> foods(String question) {
        Map<String, Document> byFood = new LinkedHashMap<>();
        List<String> named = foodNames.find(question, MAX_FOODS);
        if (!named.isEmpty()) {
            FilterExpressionBuilder b = new FilterExpressionBuilder();
            List<Document> exact = vectorStore.similaritySearch(SearchRequest.builder()
                    .query(question)
                    .topK(named.size())
                    .similarityThresholdAll()   // named in the question: kept whatever the score
                    .filterExpression(b.and(b.eq(RagChunker.TYPE, RagChunker.TYPE_FOOD),
                            b.in(RagFoodChunker.FOOD, named.toArray())).build())
                    .build());
            Map<String, Document> found = new LinkedHashMap<>();
            exact.forEach(doc -> found.putIfAbsent(String.valueOf(doc.getMetadata().get(RagFoodChunker.FOOD)), doc));
            named.forEach(food -> {
                if (found.containsKey(food)) {
                    byFood.put(food, found.get(food));   // the order of the question
                }
            });
        }
        for (Document doc : search(question, properties.foodTopK(), properties.foodSimilarityThreshold(), FOODS_ONLY)) {
            if (byFood.size() == MAX_FOODS) {
                break;
            }
            byFood.putIfAbsent(String.valueOf(doc.getMetadata().get(RagFoodChunker.FOOD)), doc);
        }
        return new ArrayList<>(byFood.values());
    }

    private List<Document> search(String question, int topK, double threshold, String filter) {
        return vectorStore.similaritySearch(SearchRequest.builder()
                .query(question)
                .topK(topK)
                .similarityThreshold(threshold)
                .filterExpression(filter)
                .build());
    }
}
