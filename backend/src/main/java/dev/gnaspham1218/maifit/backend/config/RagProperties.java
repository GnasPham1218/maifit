package dev.gnaspham1218.maifit.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

// Bound from application.yaml -> app.rag.*
@ConfigurationProperties(prefix = "app.rag")
public record RagProperties(
        int chunkSize,      // target size of one chunk, in tokens
        int minChunkChars   // the splitter never cuts a chunk shorter than this many characters
) {
}
