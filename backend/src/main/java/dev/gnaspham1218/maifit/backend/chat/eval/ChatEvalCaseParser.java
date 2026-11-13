package dev.gnaspham1218.maifit.backend.chat.eval;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatOutcome;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Reads chat-eval/cases.txt: one case per line, fields separated by "|", "#" starts a comment.
 *   expected | question | source section must contain (optional) | previous question (optional)
 * "|" instead of commas because the questions are full Vietnamese sentences with commas.
 */
public final class ChatEvalCaseParser {

    private ChatEvalCaseParser() {
    }

    public static List<ChatEvalCase> parse(String content) {
        List<ChatEvalCase> cases = new ArrayList<>();
        List<String> lines = content.lines().toList();
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i).strip();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            String[] fields = line.split("\\|", -1);
            if (fields.length < 2 || fields.length > 4 || fields[1].isBlank()) {
                throw new IllegalArgumentException("cases.txt line " + (i + 1) + ": expected 2 to 4 fields: " + line);
            }
            cases.add(new ChatEvalCase(i + 1, outcomes(fields[0], i + 1), fields[1].strip(),
                    field(fields, 2), field(fields, 3)));
        }
        return cases;
    }

    private static Set<ChatOutcome> outcomes(String field, int line) {
        Set<ChatOutcome> outcomes = EnumSet.noneOf(ChatOutcome.class);
        for (String name : field.split(",")) {
            try {
                outcomes.add(ChatOutcome.valueOf(name.strip().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("cases.txt line " + line + ": unknown outcome \"" + name.strip()
                        + "\", use one of " + Arrays.toString(ChatOutcome.values()), e);
            }
        }
        return outcomes;
    }

    private static String field(String[] fields, int index) {
        return index < fields.length ? fields[index].strip() : "";
    }
}
