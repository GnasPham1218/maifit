package dev.gnaspham1218.maifit.backend.food.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;

/**
 * Native SQL only, no JPA entity: the app writes these rows with upserts and never loads them as objects
 * (the dev reads them with SQL). Every method must run inside the caller's transaction.
 * Name normalization lives in ONE place: the generated column food_requests.normalized_name (V9).
 */
@Repository
public class FoodRequestRepository {

    // Same expression as the generated column, for comparing a raw name with stored rows
    private static final String NORMALIZE = "f_unaccent(lower(regexp_replace(btrim(:name), '\\s+', ' ', 'g')))";

    @PersistenceContext
    private EntityManager em;

    /**
     * Serializes reports of ONE user until the transaction ends, so two parallel requests cannot both
     * pass the daily-limit check. Other users are not blocked (the lock key contains the user id).
     */
    public void lockUser(Long userId) {
        em.createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(hashtextextended('food_request:' || :userId, 0))")
                .setParameter("userId", userId)
                .getSingleResult();
    }

    /** True when the name already is a food name or an alias (compared without accents/case). */
    public boolean matchesExistingFood(String name) {
        Object found = em.createNativeQuery("""
                        SELECT EXISTS (
                            SELECT 1 FROM foods WHERE f_unaccent(lower(name)) = %1$s
                            UNION ALL
                            SELECT 1 FROM food_aliases WHERE f_unaccent(lower(alias)) = %1$s
                        )
                        """.formatted(NORMALIZE))
                .setParameter("name", name)
                .getSingleResult();
        return Boolean.TRUE.equals(found);
    }

    public boolean hasVoted(Long userId, String name) {
        Object found = em.createNativeQuery("""
                        SELECT EXISTS (
                            SELECT 1 FROM food_request_votes v
                            JOIN food_requests r ON r.id = v.request_id
                            WHERE v.user_id = :userId AND r.normalized_name = %s
                        )
                        """.formatted(NORMALIZE))
                .setParameter("userId", userId)
                .setParameter("name", name)
                .getSingleResult();
        return Boolean.TRUE.equals(found);
    }

    public int countVotesSince(Long userId, OffsetDateTime since) {
        Number n = (Number) em.createNativeQuery(
                        "SELECT count(*) FROM food_request_votes WHERE user_id = :userId AND created_at >= :since")
                .setParameter("userId", userId)
                .setParameter("since", since)
                .getSingleResult();
        return n.intValue();
    }

    /** Insert the name or touch the existing row; atomic even when two users report it at the same time. */
    public long upsertUserRequest(String name) {
        Number id = (Number) em.createNativeQuery("""
                        INSERT INTO food_requests (display_name, source) VALUES (btrim(:name), 'USER')
                        ON CONFLICT (normalized_name) DO UPDATE SET last_requested_at = now()
                        RETURNING id
                        """)
                .setParameter("name", name)
                .getSingleResult();
        return id.longValue();
    }

    /** @return true if this is the user's first vote for the request (PRIMARY KEY makes repeats a no-op) */
    public boolean addVote(long requestId, Long userId) {
        int inserted = em.createNativeQuery("""
                        INSERT INTO food_request_votes (request_id, user_id) VALUES (:requestId, :userId)
                        ON CONFLICT DO NOTHING
                        """)
                .setParameter("requestId", requestId)
                .setParameter("userId", userId)
                .executeUpdate();
        if (inserted == 1) {
            em.createNativeQuery("UPDATE food_requests SET user_count = user_count + 1 WHERE id = :id")
                    .setParameter("id", requestId)
                    .executeUpdate();
        }
        return inserted == 1;
    }

    /** The photo AI saw a food we do not have: count it, no vote, no daily limit. */
    public void recordAiMiss(String name) {
        em.createNativeQuery("""
                        INSERT INTO food_requests (display_name, source, ai_count) VALUES (btrim(:name), 'AI', 1)
                        ON CONFLICT (normalized_name) DO UPDATE
                        SET ai_count = food_requests.ai_count + 1, last_requested_at = now()
                        """)
                .setParameter("name", name)
                .executeUpdate();
    }
}
