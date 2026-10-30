package dev.gnaspham1218.maifit.backend.auth.repository;

import dev.gnaspham1218.maifit.backend.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // Reuse of an old token detected: revoke EVERY session of that user.
    // Must be called inside a @Transactional service method.
    @Modifying
    @Query("""
            update RefreshToken t
               set t.revokedAt = :now
             where t.user.id = :userId
               and t.revokedAt is null
            """)
    int revokeAllForUser(@Param("userId") Long userId, @Param("now") Instant now);
}
