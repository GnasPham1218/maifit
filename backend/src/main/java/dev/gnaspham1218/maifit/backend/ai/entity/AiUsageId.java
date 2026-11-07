package dev.gnaspham1218.maifit.backend.ai.entity;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;

/**
 * Composite primary key for ai_usage table.
 * JPA requires a separate class when a table has no single @Id column.
 */
public class AiUsageId implements Serializable {
    private Long userId;
    private LocalDate usageDate;
    private AiFeature feature;

    public AiUsageId() {}

    public AiUsageId(Long userId, LocalDate usageDate, AiFeature feature) {
        this.userId = userId;
        this.usageDate = usageDate;
        this.feature = feature;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AiUsageId that)) return false;
        return Objects.equals(userId, that.userId)
                && Objects.equals(usageDate, that.usageDate)
                && feature == that.feature;
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, usageDate, feature);
    }
}
