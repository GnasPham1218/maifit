package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import dev.gnaspham1218.maifit.backend.chat.ingest.RagChunker;
import dev.gnaspham1218.maifit.backend.chat.ingest.RagFoodChunker;
import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Decides in code whether the model's answer is shown. The model can be talked into anything,
 * so its own claim "ANSWERED" is not enough: the answer must also cite excerpts that really exist.
 * An answer written from outside knowledge usually cannot cite any, and is replaced by a refusal.
 * Portions are checked the same way: only foods of the retrieved food excerpts, only sane amounts.
 * A bad portion is dropped, the answer stays.
 */
@Component
public class ModelAnswerValidator {

    static final int MAX_ANSWER_CHARS = 6000;   // far above a normal answer; the DB column allows 8000
    static final int MAX_PORTIONS = 10;
    static final BigDecimal MAX_GRAMS = BigDecimal.valueOf(2000);
    // "[2]" or "[1, 3]" left in the text: the user sees a list of sources, not excerpt numbers
    private static final Pattern INLINE_CITATION = Pattern.compile("\\s*\\[\\d+(?:\\s*,\\s*\\d+)*]");

    public ValidatedAnswer validate(ModelAnswer raw, List<Document> chunks) {
        if (raw == null || raw.outcome() == null) {
            return ValidatedAnswer.declined(ChatOutcome.NO_INFO);
        }
        ChatOutcome outcome = parse(raw.outcome());
        if (outcome != ChatOutcome.ANSWERED) {
            return ValidatedAnswer.declined(outcome);   // a refusal never carries model text
        }

        String answer = raw.answer() == null ? "" : INLINE_CITATION.matcher(raw.answer()).replaceAll("").strip();
        List<Integer> cited = citations(raw.citedChunks(), chunks.size());
        if (answer.isEmpty() || answer.length() > MAX_ANSWER_CHARS || cited == null) {
            return ValidatedAnswer.declined(ChatOutcome.NO_INFO);
        }

        // A food used in a calculation is a source too, even if the model forgot to cite it
        Set<Integer> sources = new LinkedHashSet<>(cited);
        List<PortionRequest> portions = portions(raw.portions(), chunks, sources);
        return new ValidatedAnswer(ChatOutcome.ANSWERED, answer, new ArrayList<>(sources), portions);
    }

    /** Keeps the portions that point at a food excerpt with a sane amount; adds their excerpts to the sources. */
    private static List<PortionRequest> portions(List<ModelPortion> raw, List<Document> chunks, Set<Integer> sources) {
        List<PortionRequest> portions = new ArrayList<>();
        if (raw == null) {
            return portions;
        }
        for (ModelPortion portion : raw) {
            if (portions.size() == MAX_PORTIONS) {
                break;
            }
            if (portion == null || portion.excerpt() == null || portion.excerpt() < 1
                    || portion.excerpt() > chunks.size() || portion.grams() == null || !Double.isFinite(portion.grams())) {
                continue;
            }
            int index = portion.excerpt() - 1;
            Map<String, Object> meta = chunks.get(index).getMetadata();
            // Only a food of the table can be calculated; its name comes from our metadata, not from the model
            if (!RagChunker.TYPE_FOOD.equals(meta.get(RagChunker.TYPE))
                    || !(meta.get(RagFoodChunker.FOOD) instanceof String food) || food.isBlank()) {
                continue;
            }
            BigDecimal grams = BigDecimal.valueOf(portion.grams()).setScale(0, RoundingMode.HALF_UP);
            if (grams.signum() <= 0 || grams.compareTo(MAX_GRAMS) > 0) {
                continue;
            }
            portions.add(new PortionRequest(food, preparation(portion.preparation()), grams,
                    Boolean.TRUE.equals(portion.estimated())));
            sources.add(index);
        }
        return portions;
    }

    /** Unknown or missing: null, so the user is asked (never a guess). */
    private static Preparation preparation(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Preparation.valueOf(value.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** 1-based numbers -> 0-based indexes, in order, without duplicates. Null when empty or out of range. */
    private static List<Integer> citations(List<Integer> numbers, int chunkCount) {
        if (numbers == null || numbers.isEmpty()) {
            return null;
        }
        Set<Integer> indexes = new LinkedHashSet<>();
        for (Integer number : numbers) {
            if (number == null || number < 1 || number > chunkCount) {
                return null;   // a citation that points at nothing: the whole answer is not trusted
            }
            indexes.add(number - 1);
        }
        return new ArrayList<>(indexes);
    }

    private static ChatOutcome parse(String value) {
        try {
            return ChatOutcome.valueOf(value.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return ChatOutcome.NO_INFO;
        }
    }
}
