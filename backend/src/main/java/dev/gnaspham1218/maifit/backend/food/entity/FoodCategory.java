package dev.gnaspham1218.maifit.backend.food.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

// A group of the food library filter (V18). Reference data from migrations only.
@Entity
@Table(name = "food_categories")
@Immutable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FoodCategory {

    @Id
    private Long id;

    @Column(nullable = false, length = 32)
    private String code; // stable key, e.g. STARCH

    @Column(nullable = false, length = 60)
    private String name; // shown to the user, e.g. "Tinh bột"

    @Column(name = "sort_order", nullable = false)
    private short sortOrder;
}
