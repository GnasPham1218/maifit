package dev.gnaspham1218.maifit.backend.auth.repository;

import dev.gnaspham1218.maifit.backend.auth.entity.EmailToken;
import dev.gnaspham1218.maifit.backend.auth.entity.EmailTokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface EmailTokenRepository extends JpaRepository<EmailToken, Long> {

    Optional<EmailToken> findByTokenHash(String tokenHash);

    // When a new link is sent (e.g. "forgot password" twice), invalidate older links of the same type.
    // Must be called inside a @Transactional service method.
    @Modifying
    @Query("""
            update EmailToken t
               set t.usedAt = :now
             where t.user.id = :userId
               and t.type = :type
               and t.usedAt is null
            """)
    int invalidateAll(@Param("userId") Long userId,
                      @Param("type") EmailTokenType type,
                      @Param("now") Instant now);
}
