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

    // Calories per calendar day (Vietnam time) for the month calendar / chart, in ONE query.
    // Native SQL because JPQL has no "AT TIME ZONE". Each item is rounded to 0.1 before summing,
    // exactly like NutritionCalculator, so these totals match GET /meals?date= to the decimal.
    // Columns: [0] day (date), [1] kcal (numeric)
    @Query(value = """
            select cast(m.eaten_at at time zone :zone as date) as day,
                   sum(round(i.grams * f.kcal / 100, 1))       as kcal
            from meal_logs m
            join meal_items i on i.meal_log_id = m.id
            join foods f on f.id = i.food_id
            where m.user_id = :userId and m.eaten_at >= :from and m.eaten_at < :to
            group by day
            order by day
            """, nativeQuery = true)
    List<Object[]> sumKcalPerDay(@Param("userId") Long userId,
                                 @Param("from") Instant from,
                                 @Param("to") Instant to,
                                 @Param("zone") String zone);

    // Meals of one user in [from, to): used for the per-day limit (uses index (user_id, eaten_at))
    long countByUserIdAndEatenAtGreaterThanEqualAndEatenAtLessThan(Long userId, Instant from, Instant to);

    // Ownership check built into the query: another user's meal simply is "not found" (IDOR)
    @EntityGraph(attributePaths = {"items", "items.food"})
    Optional<MealLog> findByIdAndUserId(Long id, Long userId);
}
