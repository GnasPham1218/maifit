package dev.gnaspham1218.maifit.backend.food.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

// An allergen group (V24): the checkboxes of the profile. Reference data from migrations only.
@Entity
@Table(name = "allergens")
@Immutable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Allergen {

    @Id
    @Column(length = 20)
    private String code; // stable key, e.g. MILK

    @Column(nullable = false, length = 60)
    private String name; // shown to the user, e.g. "Sữa"

    @Column(nullable = false, length = 200)
    private String examples; // what the group covers, shown under the checkbox

    @Column(name = "sort_order", nullable = false)
    private short sortOrder;
}
