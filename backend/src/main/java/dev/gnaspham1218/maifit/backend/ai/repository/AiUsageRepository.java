package dev.gnaspham1218.maifit.backend.ai.repository;

import dev.gnaspham1218.maifit.backend.ai.entity.AiUsage;
import dev.gnaspham1218.maifit.backend.ai.entity.AiUsageId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;

/**
 * Atomic upsert: increment count by 1 only if below the limit.
 * INSERT if no row exists yet (count starts at 1).
 * UPDATE if row exists AND count < limit.
 * Returns affected rows: 1 = OK, 0 = limit reached.
 */
public interface AiUsageRepository extends JpaRepository<AiUsage, AiUsageId> {

    @Modifying
    @Query(value = """
            INSERT INTO ai_usage (user_id, usage_date, feature, count, created_at)
            VALUES (:userId, :usageDate, :feature, 1, now())
            ON CONFLICT (user_id, usage_date, feature)
            DO UPDATE SET count = ai_usage.count + 1
            WHERE ai_usage.count < :limit
            """, nativeQuery = true)
    int tryIncrement(Long userId, LocalDate usageDate, String feature, int limit);

    @Modifying
    @Query(value = """
            UPDATE ai_usage
            SET count = GREATEST(count - 1, 0)
            WHERE user_id = :userId
              AND usage_date = :usageDate
              AND feature = :feature
            """, nativeQuery = true)
    void refund(Long userId, LocalDate usageDate, String feature);

    // The row exists: acquire() created it before the call
    @Modifying
    @Query(value = """
            UPDATE ai_usage
            SET input_tokens = input_tokens + :input,
                output_tokens = output_tokens + :output
            WHERE user_id = :userId
              AND usage_date = :usageDate
              AND feature = :feature
            """, nativeQuery = true)
    void addTokens(Long userId, LocalDate usageDate, String feature, long input, long output);
}
