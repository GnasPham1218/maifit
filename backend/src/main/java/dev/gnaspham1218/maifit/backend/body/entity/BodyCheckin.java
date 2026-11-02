package dev.gnaspham1218.maifit.backend.body.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "body_checkins")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BodyCheckin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Long userId;

    @Column(nullable = false)
    private Instant checkedAt;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Column(precision = 4, scale = 1)
    private BigDecimal bodyFatPct;

    @Column(precision = 4, scale = 1)
    private BigDecimal waistCm;

    @Column(length = 500)
    private String note;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public BodyCheckin(Long userId, Instant checkedAt, BigDecimal weightKg,
                       BigDecimal bodyFatPct, BigDecimal waistCm, String note) {
        this.userId = userId;
        this.checkedAt = checkedAt;
        this.weightKg = weightKg;
        this.bodyFatPct = bodyFatPct;
        this.waistCm = waistCm;
        this.note = note;
        this.createdAt = Instant.now();
    }
}
