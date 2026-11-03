package dev.gnaspham1218.maifit.backend.meal.repository;

import dev.gnaspham1218.maifit.backend.meal.entity.MealLog;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MealLogRepository extends JpaRepository<MealLog, Long> {

    // One query loads the meals of a day with their items and foods (no N+1 queries)
    @Query("""
            select distinct m from MealLog m
            left join fetch m.items i
            left join fetch i.food
            where m.userId = :userId and m.eatenAt >= :from and m.eatenAt < :to
            order by m.eatenAt
            """)
    List<MealLog> findWithItemsBetween(@Param("userId") Long userId,
                                       @Param("from") Instant from,
                                       @Param("to") Instant to);

    // Meals of one user in [from, to): used for the per-day limit (uses index (user_id, eaten_at))
    long countByUserIdAndEatenAtGreaterThanEqualAndEatenAtLessThan(Long userId, Instant from, Instant to);

    // Ownership check built into the query: another user's meal simply is "not found" (IDOR)
    @EntityGraph(attributePaths = {"items", "items.food"})
    Optional<MealLog> findByIdAndUserId(Long id, Long userId);
}
