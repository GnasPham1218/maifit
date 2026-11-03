package dev.gnaspham1218.maifit.backend.meal.entity;

import dev.gnaspham1218.maifit.backend.food.entity.Food;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

// One eating event ("the receipt header"). Its items are the lines of the receipt.
// Items are only changed through this class (aggregate root), so the two sides of the
// relationship never get out of sync.
@Entity
@Table(name = "meal_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MealLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Long userId;

    @Column(nullable = false)
    private Instant eatenAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private MealType mealType;

    @Column(length = 64)
    private String photoKey; // priority 2 (saved food photos); always null for now

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    // cascade: saving/deleting the meal saves/deletes its items
    // orphanRemoval: an item removed from this list is deleted from the DB
    @OneToMany(mappedBy = "mealLog", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<MealItem> items = new ArrayList<>();

    public MealLog(Long userId, Instant eatenAt, MealType mealType) {
        this.userId = userId;
        this.eatenAt = eatenAt;
        this.mealType = mealType;
        this.createdAt = Instant.now();
    }

    // aiGrams: the AI's original estimate (photo flow), null when entered by hand
    public MealItem addItem(Food food, BigDecimal grams, BigDecimal aiGrams) {
        MealItem item = new MealItem(this, food, grams, aiGrams);
        items.add(item);
        return item;
    }

    public Optional<MealItem> findItem(Long itemId) {
        return items.stream().filter(i -> itemId.equals(i.getId())).findFirst();
    }

    public void removeItem(MealItem item) {
        items.remove(item);
    }

    // Read-only view: callers must use addItem / removeItem
    public List<MealItem> getItems() {
        return Collections.unmodifiableList(items);
    }
}
