package dev.gnaspham1218.maifit.backend.chat.repository;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatMessage;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// Only called after the conversation was checked to belong to the current user
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Whole conversation in reading order. id breaks ties: a question and its answer can share a timestamp
    List<ChatMessage> findByConversationIdOrderByCreatedAtAscIdAsc(Long conversationId);

    // The last few messages, newest first: the history sent back to the model
    List<ChatMessage> findByConversationIdOrderByCreatedAtDescIdDesc(Long conversationId, Limit limit);
}
