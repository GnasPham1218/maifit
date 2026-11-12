package dev.gnaspham1218.maifit.backend.chat.repository;

import dev.gnaspham1218.maifit.backend.chat.entity.ChatConversation;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, Long> {

    // Ownership check built into the query: another user's conversation simply is "not found" (IDOR)
    Optional<ChatConversation> findByIdAndUserId(Long id, Long userId);

    // Latest first (uses index (user_id, updated_at))
    List<ChatConversation> findByUserIdOrderByUpdatedAtDesc(Long userId, Limit limit);

    // One DELETE with the owner in the WHERE clause; the messages go with it (ON DELETE CASCADE).
    // Returns 0 when the conversation does not exist or belongs to someone else.
    @Modifying
    @Query("delete from ChatConversation c where c.id = :id and c.userId = :userId")
    int deleteOwned(@Param("id") Long id, @Param("userId") Long userId);
}
