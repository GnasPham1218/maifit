package dev.gnaspham1218.maifit.backend.profile.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

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
    @Column(nullable = false, length = 12)
    private Goal goal;

    @Column(name = "target_kcal")
    private Integer customTargetKcal; // NULL = use the suggestion computed from TDEE

    // ---- Personal coach (V26): all optional, null = not answered yet ----

    @Enumerated(EnumType.STRING)
    @Column(name = "training_experience", length = 12)
    private TrainingExperience trainingExperience;

    @Enumerated(EnumType.STRING)
    @Column(name = "training_type", length = 12)
    private TrainingType trainingType;

    @Enumerated(EnumType.STRING)
    @Column(name = "diet_type", length = 12)
    private DietType dietType;

    @Enumerated(EnumType.STRING)
    @Column(name = "suggestion_style", nullable = false, length = 10)
    private SuggestionStyle suggestionStyle = SuggestionStyle.VARIETY;

    @Column(name = "target_weight_kg", precision = 5, scale = 2)
    private BigDecimal targetWeightKg;

    // Allergen group codes (allergens table). Health data: owner only, never sent to an AI model.
    @ElementCollection
    @CollectionTable(name = "profile_allergies", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "allergen", length = 20)
    private Set<String> allergenCodes = new HashSet<>();

    // Foods the user cannot or does not want to eat: ids of RAW rows, each standing for every preparation
    @ElementCollection
    @CollectionTable(name = "profile_excluded_foods", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "food_id")
    private Set<Long> excludedFoodIds = new HashSet<>();

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

    /** Replaces the coach details. The collections are replaced in place (Hibernate tracks the same set). */
    public void updateCoach(TrainingExperience trainingExperience, TrainingType trainingType, DietType dietType,
                            SuggestionStyle suggestionStyle, BigDecimal targetWeightKg,
                            Collection<String> allergenCodes, Collection<Long> excludedFoodIds) {
        this.trainingExperience = trainingExperience;
        this.trainingType = trainingType;
        this.dietType = dietType;
        this.suggestionStyle = suggestionStyle != null ? suggestionStyle : SuggestionStyle.VARIETY;
        this.targetWeightKg = targetWeightKg;
        this.allergenCodes.clear();
        this.allergenCodes.addAll(allergenCodes);
        this.excludedFoodIds.clear();
        this.excludedFoodIds.addAll(excludedFoodIds);
        this.updatedAt = Instant.now();
    }

    /** True once the details the coach needs are answered (the app asks the user to complete them). */
    public boolean isCoachComplete() {
        return trainingExperience != null && trainingType != null && dietType != null;
    }
}
