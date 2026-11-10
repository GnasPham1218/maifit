package dev.gnaspham1218.maifit.backend.user.repository;

import dev.gnaspham1218.maifit.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    // Empty when the user has never had Premium (or does not exist)
    @Query("select u.premiumUntil from User u where u.id = :userId")
    Optional<Instant> findPremiumUntil(@Param("userId") Long userId);

    // Add `days` of Premium in ONE statement: on top of the remaining time when still Premium,
    // from now when it has ended or never existed. Done in SQL (not read-then-write in Java)
    // so two orders paid at the same moment cannot overwrite each other.
    @Modifying
    @Query(value = """
            update users
            set premium_until = greatest(coalesce(premium_until, :now), :now)
                                + cast(:days as integer) * interval '1 day'
            where id = :userId
            """, nativeQuery = true)
    int extendPremium(@Param("userId") Long userId, @Param("now") Instant now, @Param("days") int days);
}
