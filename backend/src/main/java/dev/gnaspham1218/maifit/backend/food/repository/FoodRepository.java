package dev.gnaspham1218.maifit.backend.food.repository;

import dev.gnaspham1218.maifit.backend.food.entity.Food;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface FoodRepository extends JpaRepository<Food, Long> {

    List<Food> findAllByOrderByNameAscPreparationAsc();

    /**
     * Fuzzy, accent-insensitive search in food names AND aliases (pg_trgm + unaccent, see V6).
     * Each row: [0] food id (Long), [1] similarity 0..1 (Float), [2] locks_preparation (Boolean).
     * Best match first. On a tie: the row whose text equals the term WITH accents wins ("dầu dừa" vs "đậu đũa",
     * which are identical once accents are removed), then an alias that fixes the preparation, then the lowest id.
     * Native SQL: JPQL has no similarity() or "%" operator.
     */
    @Query(value = """
            SELECT m.food_id, m.score, m.locks
            FROM (
                SELECT f.id AS food_id, similarity(f_unaccent(lower(f.name)), q.v) AS score, FALSE AS locks,
                       (lower(f.name) = lower(:term)) AS exact
                FROM foods f, (SELECT f_unaccent(lower(:term)) AS v) q
                WHERE f_unaccent(lower(f.name)) % q.v
                UNION ALL
                SELECT a.food_id, similarity(f_unaccent(lower(a.alias)), q.v), a.locks_preparation,
                       (lower(a.alias) = lower(:term))
                FROM food_aliases a, (SELECT f_unaccent(lower(:term)) AS v) q
                WHERE f_unaccent(lower(a.alias)) % q.v
            ) m
            ORDER BY m.score DESC, m.exact DESC, m.locks DESC, m.food_id
            LIMIT 5
            """, nativeQuery = true)
    List<Object[]> searchByNameOrAlias(String term);
}
