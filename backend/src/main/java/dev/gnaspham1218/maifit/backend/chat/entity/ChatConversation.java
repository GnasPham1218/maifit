package dev.gnaspham1218.maifit.backend.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

// One conversation of one user. Messages point to it by id (no JPA relation: they are always
// loaded on their own, after the ownership check on this row).
@Entity
@Table(name = "chat_conversations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatConversation {

    public static final int TITLE_LENGTH = 60;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Long userId;

    @Column(nullable = false, length = 64, updatable = false)
    private String title;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public ChatConversation(Long userId, String firstQuestion) {
        this.userId = userId;
        this.title = titleOf(firstQuestion);
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    /** Called when a message is added, so the conversation moves to the top of the list. */
    public void touch() {
        this.updatedAt = Instant.now();
    }

    /** The first characters of the question, cut at a word boundary when possible. */
    static String titleOf(String question) {
        String text = question.strip().replaceAll("\\s+", " ");
        if (text.length() <= TITLE_LENGTH) {
            return text;
        }
        String cut = text.substring(0, TITLE_LENGTH);
        int lastSpace = cut.lastIndexOf(' ');
        if (lastSpace > TITLE_LENGTH / 2) {   // a very long first word is cut in the middle instead
            cut = cut.substring(0, lastSpace);
        }
        return cut + "…";
    }
}
