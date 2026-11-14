package dev.gnaspham1218.maifit.backend.food.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

// A photo of one food row (V18): raw rice and cooked rice have their own photos. Added by migrations,
// files under frontend/public/. Every photo keeps its own credit and license.
@Entity
@Table(name = "food_images")
@Immutable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FoodImage {

    @Id
    private Long id;

    @Column(name = "food_id", nullable = false)
    private Long foodId;

    @Column(nullable = false, length = 200)
    private String path; // relative to the site root, e.g. "foods/gao-te-boiled-1.webp"

    @Column(nullable = false, length = 200)
    private String alt;

    @Column(nullable = false, length = 200)
    private String credit;

    @Column(nullable = false, length = 60)
    private String license;

    @Column(name = "source_url")
    private String sourceUrl;

    @Column(name = "sort_order", nullable = false)
    private short sortOrder; // smallest = the main photo
}
