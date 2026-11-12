package dev.gnaspham1218.maifit.backend.chat.ingest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Loads src/main/resources/rag/*.md into vector_store, prints a retrieval check, then stops the app.
 * Only exists with the "ingest" profile, so no HTTP endpoint can ever trigger it:
 *   ./mvnw spring-boot:run -Dspring-boot.run.profiles=ingest
 * Safe to run again: the chunks of a file are deleted before the new ones are written.
 */
@Component
@Profile("ingest")
public class RagIngestRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RagIngestRunner.class);

    private static final String SOURCES = "classpath:rag/*.md";
    private static final int CHECK_TOP_K = 3;

    /** Vietnamese questions against English sources; the last two must score clearly lower (out of scope). */
    private static final List<String> CHECK_QUESTIONS = List.of(
            "Nên ăn bao nhiêu protein mỗi ngày khi tập tạ?",
            "Uống creatine có an toàn không?",
            "Nên ăn gì trước và sau khi tập?",
            "Nhịn ăn gián đoạn có giúp giảm mỡ không?",
            "Ăn đạm trước khi ngủ có tác dụng gì?",
            "TDEE gồm những thành phần nào?",
            "Thủ đô của nước Pháp là gì?",
            "Viết giúp tôi một hàm Java sắp xếp mảng");

    private final ApplicationContext context;
    private final RagMarkdownParser parser;
    private final RagChunker chunker;
    private final VectorStore vectorStore;

    public RagIngestRunner(ApplicationContext context, RagMarkdownParser parser, RagChunker chunker,
                           VectorStore vectorStore) {
        this.context = context;
        this.parser = parser;
        this.chunker = chunker;
        this.vectorStore = vectorStore;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        Resource[] files = context.getResources(SOURCES);
        Arrays.sort(files, Comparator.comparing(Resource::getFilename));
        if (files.length == 0) {
            throw new IllegalStateException("No source files found at " + SOURCES);
        }

        int total = 0;
        for (Resource file : files) {
            String fileName = file.getFilename();
            RagDocument document = parser.parse(fileName, file.getContentAsString(StandardCharsets.UTF_8));
            List<Document> chunks = chunker.chunk(document);

            // Delete first, then add: running the ingest twice never leaves two copies of a file
            vectorStore.delete(new FilterExpressionBuilder().eq(RagChunker.SOURCE, fileName).build());
            vectorStore.add(chunks);   // embeds every chunk with Ollama, then inserts the rows

            total += chunks.size();
            log.info("Ingested {}: {} sections -> {} chunks", fileName, document.sections().size(), chunks.size());
        }
        log.info("Ingest done: {} files, {} chunks", files.length, total);

        printRetrievalCheck();

        // The work is finished: close the context and end the JVM instead of staying up as a web server
        System.exit(SpringApplication.exit(context, () -> 0));
    }

    /** Shows what the chat would retrieve, so a bad chunking or a bad source is visible before any chat code runs. */
    private void printRetrievalCheck() {
        for (String question : CHECK_QUESTIONS) {
            List<Document> hits = vectorStore.similaritySearch(
                    SearchRequest.builder().query(question).topK(CHECK_TOP_K).build());
            log.info("Q: {}", question);
            for (Document hit : hits) {
                log.info("   {}  {} | {}",
                        String.format(Locale.ROOT, "%.3f", hit.getScore()),
                        hit.getMetadata().get(RagChunker.SOURCE),
                        hit.getMetadata().get(RagChunker.SECTION));
            }
        }
    }
}
