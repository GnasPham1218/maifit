package dev.gnaspham1218.maifit.backend.chat.ingest;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads the Markdown files written by tools/rag-import/convert.py:
 * a front matter block between two "---" lines (key: "value"), then headings and text.
 * Written by hand on purpose: the format is ours and tiny, so no Markdown library is needed.
 */
@Component
public class RagMarkdownParser {

    private static final String FENCE = "---";
    private static final Pattern FIELD = Pattern.compile("^([a-z_]+): \"(.*)\"$");
    private static final Pattern HEADING = Pattern.compile("^(#{1,4}) (.+)$");
    // Without these a chunk could not be cited (title, url) or reused legally (license, accessed)
    private static final List<String> REQUIRED = List.of("title", "url", "license", "accessed");
    private static final int DEEPEST_LEVEL = 4;   // "####"

    public RagDocument parse(String fileName, String content) {
        List<String> lines = content.lines().toList();   // lines() accepts both LF and CRLF
        if (lines.isEmpty() || !lines.get(0).equals(FENCE)) {
            throw new IllegalArgumentException(fileName + ": the file must start with a front matter block (---)");
        }
        int close = lines.subList(1, lines.size()).indexOf(FENCE) + 1;
        if (close == 0) {
            throw new IllegalArgumentException(fileName + ": the front matter block is not closed (---)");
        }

        Map<String, String> meta = new LinkedHashMap<>();
        for (String line : lines.subList(1, close)) {
            Matcher field = FIELD.matcher(line);
            if (!field.matches()) {
                throw new IllegalArgumentException(fileName + ": bad front matter line: " + line);
            }
            meta.put(field.group(1), field.group(2));
        }
        for (String key : REQUIRED) {
            if (meta.getOrDefault(key, "").isBlank()) {
                throw new IllegalArgumentException(fileName + ": front matter is missing \"" + key + "\"");
            }
        }

        return new RagDocument(fileName, meta, sections(lines.subList(close + 1, lines.size())));
    }

    /**
     * Cuts the body at every "##", "###" and "####" heading. The "#" line repeats the title and is skipped.
     * headings[level] remembers the current heading of each level, so every section knows its full path.
     */
    private static List<RagSection> sections(List<String> body) {
        List<RagSection> sections = new ArrayList<>();
        String[] headings = new String[DEEPEST_LEVEL + 1];
        StringBuilder text = new StringBuilder();

        for (String line : body) {
            Matcher heading = HEADING.matcher(line);
            if (!heading.matches()) {
                text.append(line).append('\n');
                continue;
            }
            addSection(sections, headings, text);
            int level = heading.group(1).length();
            if (level >= 2) {
                headings[level] = heading.group(2).strip();
                for (int deeper = level + 1; deeper <= DEEPEST_LEVEL; deeper++) {
                    headings[deeper] = null;   // a new "##" ends the "###" and "####" under the previous one
                }
            }
        }
        addSection(sections, headings, text);
        return sections;
    }

    /** Stores the text collected so far under the current headings, then starts a new, empty text. */
    private static void addSection(List<RagSection> sections, String[] headings, StringBuilder text) {
        String content = text.toString().strip();
        text.setLength(0);
        List<String> path = new ArrayList<>();
        for (int level = 2; level <= DEEPEST_LEVEL; level++) {
            if (headings[level] != null) {
                path.add(headings[level]);
            }
        }
        // No text: a heading followed directly by a sub-heading. No path: blank lines before the first "##".
        if (!content.isEmpty() && !path.isEmpty()) {
            sections.add(new RagSection(List.copyOf(path), content));
        }
    }
}
