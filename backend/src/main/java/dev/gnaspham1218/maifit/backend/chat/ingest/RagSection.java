package dev.gnaspham1218.maifit.backend.chat.ingest;

import java.util.List;

/**
 * The text under one heading of a source file.
 *
 * @param path headings leading to this text, outermost first, e.g. ["Protein timing", "Pre-sleep protein intake"]
 * @param text the paragraphs and list items directly under the last heading of the path
 */
public record RagSection(List<String> path, String text) {
}
