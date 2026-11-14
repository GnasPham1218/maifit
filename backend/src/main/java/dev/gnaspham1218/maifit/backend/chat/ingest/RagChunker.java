package dev.gnaspham1218.maifit.backend.chat.ingest;

import dev.gnaspham1218.maifit.backend.config.RagProperties;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Turns a parsed source file into the chunks stored in vector_store.
 * Sections come already cut by heading; a section longer than one chunk is cut again by Spring AI's
 * token splitter, which looks for the end of a sentence near the size limit.
 */
@Component
@Profile("ingest")   // the splitter loads a tokenizer: not needed by the running app
public class RagChunker {

    /** Metadata keys. The chat reads these back to build the list of sources. */
    public static final String TYPE = "type";
    public static final String SOURCE = "source";
    public static final String TITLE = "title";
    public static final String SECTION = "section";
    public static final String URL = "url";
    public static final String LICENSE = "license";
    public static final String ACCESSED = "accessed";
    public static final String PUBLISHER = "publisher";

    public static final String TYPE_DOCUMENT = "document";
    public static final String TYPE_FOOD = "food";
    private static final String PATH_SEPARATOR = " > ";

    private final TokenTextSplitter splitter;

    public RagChunker(RagProperties properties) {
        this.splitter = TokenTextSplitter.builder()
                .withChunkSize(properties.chunkSize())
                .withMinChunkSizeChars(properties.minChunkChars())
                .build();
    }

    public List<Document> chunk(RagDocument document) {
        String title = document.meta().get(TITLE);
        List<Document> chunks = new ArrayList<>();
        for (RagSection section : document.sections()) {
            String sectionPath = String.join(PATH_SEPARATOR, section.path());
            // The heading path goes INTO the text that is embedded: "1.4-2.0 g/kg/day" alone is ambiguous,
            // "... protein and exercise > Recommended intake" in front of it is not.
            String header = title + PATH_SEPARATOR + sectionPath;

            List<Document> parts = splitter.apply(List.of(Document.builder().text(section.text()).build()));
            for (Document part : parts) {
                Map<String, Object> metadata = new LinkedHashMap<>();
                metadata.put(TYPE, TYPE_DOCUMENT);
                metadata.put(SOURCE, document.fileName());
                metadata.put(TITLE, title);
                metadata.put(SECTION, sectionPath);
                metadata.put(URL, document.meta().get(URL));
                metadata.put(LICENSE, document.meta().get(LICENSE));
                metadata.put(ACCESSED, document.meta().get(ACCESSED));
                if (document.meta().containsKey(PUBLISHER)) {
                    metadata.put(PUBLISHER, document.meta().get(PUBLISHER));
                }
                chunks.add(Document.builder()
                        .text(header + "\n\n" + part.getText())
                        .metadata(metadata)
                        .build());
            }
        }
        return chunks;
    }
}
