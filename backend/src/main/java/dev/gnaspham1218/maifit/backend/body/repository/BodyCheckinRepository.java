package dev.gnaspham1218.maifit.backend.body.repository;

import dev.gnaspham1218.maifit.backend.body.entity.BodyCheckin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface BodyCheckinRepository extends JpaRepository<BodyCheckin, Long> {

    // Current weight = most recent check-in
    Optional<BodyCheckin> findFirstByUserIdOrderByCheckedAtDesc(Long userId);

    // [from, to) for the history list / weight chart
    List<BodyCheckin> findByUserIdAndCheckedAtGreaterThanEqualAndCheckedAtLessThanOrderByCheckedAtAsc(
            Long userId, Instant from, Instant to);

    // Ownership check built into the query: another user's id simply is "not found" (IDOR)
    Optional<BodyCheckin> findByIdAndUserId(Long id, Long userId);
}
