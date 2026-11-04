package dev.gnaspham1218.maifit.backend.meal.entity;

import dev.gnaspham1218.maifit.backend.food.entity.Food;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;

// One ingredient of a meal. Nutrition is NOT stored here: it is computed when reading,
// grams x foods.<value> / 100 (no snapshot).
@Entity
@Table(name = "meal_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MealItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meal_log_id", nullable = false, updatable = false)
    private MealLog mealLog;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "food_id", nullable = false)
    private Food food;

    @Column(nullable = false, precision = 6, scale = 1)
    private BigDecimal grams;

    @Column(precision = 6, scale = 1)
    private BigDecimal aiGrams;

    // 0-100, only meaningful when food.leanVersion != null (V11). null = use food as listed.
    // The column is SMALLINT; Hibernate maps Integer to INTEGER by default, and ddl-auto=validate
    // rejects the mismatch at startup, so the JDBC type is pinned here.
    @Column(name = "fat_percent")
    @JdbcTypeCode(SqlTypes.SMALLINT)
    private Integer fatPercent;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    // Package-private: only MealLog.addItem creates items
    MealItem(MealLog mealLog, Food food, BigDecimal grams, BigDecimal aiGrams, Integer fatPercent) {
        this.mealLog = mealLog;
        this.food = food;
        this.grams = grams;
        this.aiGrams = aiGrams;
        this.fatPercent = fatPercent;
        this.createdAt = Instant.now();
    }

    // aiGrams is never changed: it keeps the AI's original guess to compare with
    public void changeGrams(BigDecimal grams) {
        this.grams = grams;
    }

    public void changeFatPercent(Integer fatPercent) {
        this.fatPercent = fatPercent;
    }
}
