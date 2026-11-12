package dev.gnaspham1218.maifit.backend.chat.ingest;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Plain unit test: no Spring context, no database
class RagMarkdownParserTest {

    private static final String FILE = """
            ---
            title: "Protein and exercise"
            url: "https://example.org/protein"
            license: "CC BY 4.0"
            accessed: "2026-11-12"
            ---

            # Protein and exercise

            ## Abstract

            First paragraph.

            Second paragraph.

            ## Protein timing

            ### Pre-sleep protein intake

            Casein before sleep.

            #### Key points

            - point one
            - point two

            ### Meal timing

            Every three hours.

            ## Conclusion

            The end.
            """;

    private final RagMarkdownParser parser = new RagMarkdownParser();

    @Test
    void readsFrontMatter() {
        RagDocument document = parser.parse("protein.md", FILE);

        assertThat(document.fileName()).isEqualTo("protein.md");
        assertThat(document.meta())
                .containsEntry("title", "Protein and exercise")
                .containsEntry("url", "https://example.org/protein")
                .containsEntry("license", "CC BY 4.0")
                .containsEntry("accessed", "2026-11-12");
    }

    @Test
    void cutsTheBodyAtEveryHeadingAndKeepsTheFullPath() {
        List<RagSection> sections = parser.parse("protein.md", FILE).sections();

        // "## Protein timing" has no text of its own, so it only appears inside the paths below
        assertThat(sections).extracting(RagSection::path).containsExactly(
                List.of("Abstract"),
                List.of("Protein timing", "Pre-sleep protein intake"),
                List.of("Protein timing", "Pre-sleep protein intake", "Key points"),
                List.of("Protein timing", "Meal timing"),
                List.of("Conclusion"));
        assertThat(sections.get(0).text()).isEqualTo("First paragraph.\n\nSecond paragraph.");
        assertThat(sections.get(2).text()).isEqualTo("- point one\n- point two");
    }

    @Test
    void acceptsWindowsLineEndings() {
        RagDocument document = parser.parse("protein.md", FILE.replace("\n", "\r\n"));

        assertThat(document.sections()).hasSize(5);
        assertThat(document.sections().get(0).text()).isEqualTo("First paragraph.\n\nSecond paragraph.");
    }

    @Test
    void rejectsAFileWithoutFrontMatter() {
        assertThatThrownBy(() -> parser.parse("bad.md", "# Title\n\n## Section\n\nText."))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("bad.md");
    }

    @Test
    void rejectsFrontMatterWithoutLicense() {
        String withoutLicense = FILE.replace("license: \"CC BY 4.0\"\n", "");

        assertThatThrownBy(() -> parser.parse("protein.md", withoutLicense))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("license");
    }
}
