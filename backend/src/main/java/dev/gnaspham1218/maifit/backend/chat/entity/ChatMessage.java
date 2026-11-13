package dev.gnaspham1218.maifit.backend.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnTransformer;

import java.time.Instant;

// One message, never edited. Created only through question(...) and answer(...), so the rules of
// the CHECK constraints in V15 (outcome only on ASSISTANT, sources only when ANSWERED) hold in Java too.
@Entity
@Table(name = "chat_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Long conversationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private ChatRole role;

    @Column(nullable = false, updatable = false, columnDefinition = "text")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(length = 16, updatable = false)
    private ChatOutcome outcome;

    // JSON array of {title, section, url}, built and read by the chat service. Kept as text in Java:
    // the app never queries inside it, so no JSON mapping setup is needed; the cast stores it as jsonb.
    @Column(updatable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String sources;

    // JSON {items, total} of the portions calculated by code (see ChatCalculation), or null.
    // The only column that changes after insert: the user picks a preparation the model left open.
    @Column(columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private String calculation;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private ChatMessage(Long conversationId, ChatRole role, String content, ChatOutcome outcome, String sources,
                        String calculation) {
        this.conversationId = conversationId;
        this.role = role;
        this.content = content;
        this.outcome = outcome;
        this.sources = sources;
        this.calculation = calculation;
        this.createdAt = Instant.now();
    }

    public static ChatMessage question(Long conversationId, String question) {
        return new ChatMessage(conversationId, ChatRole.USER, question, null, null, null);
    }

    /** An answer with its sources, or a refusal (any other outcome: no text, no sources). */
    public static ChatMessage answer(Long conversationId, ChatOutcome outcome, String answer, String sourcesJson) {
        return answer(conversationId, outcome, answer, sourcesJson, null);
    }

    /** Same, with the portions calculated by code (ANSWERED only). */
    public static ChatMessage answer(Long conversationId, ChatOutcome outcome, String answer, String sourcesJson,
                                     String calculationJson) {
        if (outcome == ChatOutcome.ANSWERED) {
            return new ChatMessage(conversationId, ChatRole.ASSISTANT, answer, outcome, sourcesJson, calculationJson);
        }
        return new ChatMessage(conversationId, ChatRole.ASSISTANT, "", outcome, null, null);
    }

    public void updateCalculation(String calculationJson) {
        this.calculation = calculationJson;
    }
}
