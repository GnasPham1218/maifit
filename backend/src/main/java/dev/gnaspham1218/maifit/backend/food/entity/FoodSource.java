package dev.gnaspham1218.maifit.backend.food.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

// One dataset the nutrition numbers come from (V18), e.g. USDA SR Legacy. A new source is a new row.
@Entity
@Table(name = "food_sources")
@Immutable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FoodSource {

    private static final String REF = "{ref}";

    @Id
    private Long id;

    @Column(nullable = false, length = 32)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 160)
    private String publisher;

    @Column(nullable = false)
    private String url;

    @Column(nullable = false, length = 120)
    private String license;

    // e.g. "https://fdc.nal.usda.gov/food-details/{ref}/nutrients"; null when the source has no item pages
    @Column(name = "item_url_template")
    private String itemUrlTemplate;

    /**
     * The page of one item at its source, or null when there is no single item to link (an estimate)
     * or the source has no item pages. Static so the chatbot ingest can use it on plain JDBC rows too.
     */
    public static String itemUrl(String template, String ref) {
        return template == null || ref == null ? null : template.replace(REF, ref);
    }
}
