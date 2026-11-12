package dev.gnaspham1218.maifit.backend.chat.service;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Decides in code whether the model's answer is shown. The model can be talked into anything,
 * so its own claim "ANSWERED" is not enough: the answer must also cite excerpts that really exist.
 * An answer written from outside knowledge usually cannot cite any, and is replaced by a refusal.
 */
@Component
public class ModelAnswerValidator {

    static final int MAX_ANSWER_CHARS = 6000;   // far above a normal answer; the DB column allows 8000
    // "[2]" or "[1, 3]" left in the text: the user sees a list of sources, not excerpt numbers
    private static final Pattern INLINE_CITATION = Pattern.compile("\\s*\\[\\d+(?:\\s*,\\s*\\d+)*]");

    public ValidatedAnswer validate(ModelAnswer raw, int chunkCount) {
        if (raw == null || raw.outcome() == null) {
            return ValidatedAnswer.declined(ChatOutcome.NO_INFO);
        }
        ChatOutcome outcome = parse(raw.outcome());
        if (outcome != ChatOutcome.ANSWERED) {
            return ValidatedAnswer.declined(outcome);   // a refusal never carries model text
        }

        String answer = raw.answer() == null ? "" : INLINE_CITATION.matcher(raw.answer()).replaceAll("").strip();
        List<Integer> cited = citations(raw.citedChunks(), chunkCount);
        if (answer.isEmpty() || answer.length() > MAX_ANSWER_CHARS || cited == null) {
            return ValidatedAnswer.declined(ChatOutcome.NO_INFO);
        }
        return new ValidatedAnswer(ChatOutcome.ANSWERED, answer, cited);
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
