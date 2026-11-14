package dev.gnaspham1218.maifit.backend.food.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;

// Read-only reference data: rows only come from Flyway migrations, the app never writes them.
// @Immutable makes Hibernate skip dirty checking and reject updates.
// All nutrition values are per 100 g.
// Column names are explicit for the *G fields: Spring's naming strategy only inserts "_" before
// an uppercase letter that is FOLLOWED by a lowercase one, so "carbG" would become "carbg".
@Entity
@Table(name = "foods")
@Immutable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Food {

    @Id
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Preparation preparation;

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal kcal;

    @Column(name = "protein_g", precision = 5, scale = 2)
    private BigDecimal proteinG;

    @Column(name = "carb_g", precision = 5, scale = 2)
    private BigDecimal carbG;

    @Column(name = "fat_g", precision = 5, scale = 2)
    private BigDecimal fatG;

    @Column(name = "fiber_g", precision = 5, scale = 2)
    private BigDecimal fiberG; // null = not measured by the source, NOT zero

    @Column(nullable = false)
    private String source;

    // The source's own name for the item ("Rice, white, long-grain, regular, enriched, cooked"), V17.
    // Null for estimated rows, which combine two items.
    @Column(name = "source_description")
    private String sourceDescription;

    // True when the source has no exact match for this Vietnamese food and the closest item is used (V17)
    @Column(name = "source_approximate", nullable = false)
    private boolean sourceApproximate;

    // Non-null only on the "as sold" (fatty) row of a pair that has a matching lean-only row
    // (V11 — currently just Sườn thăn heo / Sườn lưng heo). Lets a meal item interpolate
    // nutrition between this row and leanVersion using meal_items.fat_percent.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lean_version_id")
    private Food leanVersion;

    // For FoodMapper (MapStruct maps FoodResponse.leanVersionId from this getter)
    public Long getLeanVersionId() {
        return leanVersion == null ? null : leanVersion.getId();
    }
}
