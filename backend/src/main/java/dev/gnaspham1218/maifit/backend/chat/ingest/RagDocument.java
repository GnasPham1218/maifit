package dev.gnaspham1218.maifit.backend.chat.ingest;

import java.util.List;
import java.util.Map;

/**
 * One source file of src/main/resources/rag, parsed.
 *
 * @param fileName file name, e.g. "issn-protein.md"; identifies the source in vector_store
 * @param meta     front matter (title, url, license, accessed...), in file order
 * @param sections the body, one entry per heading that has text of its own
 */
public record RagDocument(String fileName, Map<String, String> meta, List<RagSection> sections) {
}
