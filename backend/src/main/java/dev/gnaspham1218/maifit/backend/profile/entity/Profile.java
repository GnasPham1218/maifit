package dev.gnaspham1218.maifit.backend.profile.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

// 1–1 with users: the primary key IS the user id (no separate id column)
@Entity
@Table(name = "profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Profile {

    @Id
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Sex sex;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Column(nullable = false, precision = 4, scale = 1)
    private BigDecimal heightCm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ActivityLevel activityLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Goal goal;

    @Column(name = "target_kcal")
    private Integer customTargetKcal; // NULL = use the suggestion computed from TDEE

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    public Profile(Long userId, Sex sex, LocalDate birthDate, BigDecimal heightCm,
                   ActivityLevel activityLevel, Goal goal, Integer customTargetKcal) {
        this.userId = userId;
        this.createdAt = Instant.now();
        update(sex, birthDate, heightCm, activityLevel, goal, customTargetKcal);
    }

    public void update(Sex sex, LocalDate birthDate, BigDecimal heightCm,
                       ActivityLevel activityLevel, Goal goal, Integer customTargetKcal) {
        this.sex = sex;
        this.birthDate = birthDate;
        this.heightCm = heightCm;
        this.activityLevel = activityLevel;
        this.goal = goal;
        this.customTargetKcal = customTargetKcal;
        this.updatedAt = Instant.now();
    }
}
