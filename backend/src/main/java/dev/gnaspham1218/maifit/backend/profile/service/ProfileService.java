package dev.gnaspham1218.maifit.backend.profile.service;

import dev.gnaspham1218.maifit.backend.body.dto.BodyCheckinResponse;
import dev.gnaspham1218.maifit.backend.body.service.BodyCheckinService;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import dev.gnaspham1218.maifit.backend.food.entity.Allergen;
import dev.gnaspham1218.maifit.backend.food.entity.Food;
import dev.gnaspham1218.maifit.backend.food.entity.Preparation;
import dev.gnaspham1218.maifit.backend.food.repository.AllergenRepository;
import dev.gnaspham1218.maifit.backend.food.repository.FoodRepository;
import dev.gnaspham1218.maifit.backend.profile.dto.EnergyTargets;
import dev.gnaspham1218.maifit.backend.profile.dto.ExcludedFoodResponse;
import dev.gnaspham1218.maifit.backend.profile.dto.ProfileRequest;
import dev.gnaspham1218.maifit.backend.profile.dto.ProfileResponse;
import dev.gnaspham1218.maifit.backend.profile.entity.Profile;
import dev.gnaspham1218.maifit.backend.profile.mapper.ProfileMapper;
import dev.gnaspham1218.maifit.backend.profile.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProfileService {

    static final int MIN_AGE = 13;
    static final int MAX_AGE = 100;

    private final ProfileRepository profileRepository;
    private final BodyCheckinService bodyCheckinService;
    private final ProfileMapper profileMapper;
    private final AllergenRepository allergenRepository;
    private final FoodRepository foodRepository;

    @Transactional(readOnly = true)
    public ProfileResponse get(Long userId) {
        Profile profile = profileRepository.findById(userId)
                // The frontend uses this code to show the onboarding form
                .orElseThrow(() -> new AppException(ErrorCode.PROFILE_NOT_FOUND));
        return toResponse(profile);
    }

    // PUT semantics: creates the profile the first time, replaces it afterwards
    @Transactional
    public ProfileResponse upsert(Long userId, ProfileRequest req) {
        int age = TdeeCalculator.ageOn(req.birthDate(), today());
        if (age < MIN_AGE || age > MAX_AGE) {
            throw new AppException(ErrorCode.AGE_OUT_OF_RANGE);
        }
        Set<String> allergens = checkedAllergens(req.allergensOrEmpty());
        Set<Long> excludedFoodIds = rawRowIds(req.excludedFoodIdsOrEmpty());

        Profile profile = profileRepository.findById(userId)
                .map(existing -> {
                    existing.update(req.sex(), req.birthDate(), req.heightCm(),
                            req.activityLevel(), req.goal(), req.customTargetKcal());
                    return existing; // managed entity: saved automatically at commit (dirty checking)
                })
                .orElseGet(() -> profileRepository.save(new Profile(userId, req.sex(), req.birthDate(),
                        req.heightCm(), req.activityLevel(), req.goal(), req.customTargetKcal())));
        profile.updateCoach(req.trainingExperience(), req.trainingType(), req.dietType(), req.suggestionStyle(),
                req.targetWeightKg(), allergens, excludedFoodIds);

        return toResponse(profile);
    }

    /** Every code must exist in the allergens table (V24); the FK would refuse it anyway, with a 500. */
    private Set<String> checkedAllergens(Set<String> codes) {
        if (codes.isEmpty()) {
            return codes;
        }
        if (allergenRepository.findAllById(codes).size() != codes.size()) {
            throw new AppException(ErrorCode.UNKNOWN_ALLERGEN);
        }
        return codes;
    }

    /**
     * A food is excluded as a whole (every preparation): any row id the client sends is stored as the RAW
     * row of that food name. Unknown ids -> FOOD_NOT_FOUND.
     */
    private Set<Long> rawRowIds(Set<Long> foodIds) {
        if (foodIds.isEmpty()) {
            return foodIds;
        }
        List<Food> foods = foodRepository.findAllById(foodIds);
        if (foods.size() != foodIds.size()) {
            throw new AppException(ErrorCode.FOOD_NOT_FOUND);
        }
        Set<String> names = foods.stream().map(Food::getName).collect(Collectors.toSet());
        return foodRepository.findByNameInAndPreparation(names, Preparation.RAW).stream()
                .map(Food::getId)
                .collect(Collectors.toSet());
    }

    private ProfileResponse toResponse(Profile profile) {
        int age = TdeeCalculator.ageOn(profile.getBirthDate(), today());
        List<String> allergens = allergensInDisplayOrder(profile.getAllergenCodes());
        List<ExcludedFoodResponse> excludedFoods = foodRepository.findAllById(profile.getExcludedFoodIds()).stream()
                .map(f -> new ExcludedFoodResponse(f.getId(), f.getName()))
                .sorted(Comparator.comparing(ExcludedFoodResponse::name))
                .toList();

        BodyCheckinResponse latest = bodyCheckinService.findLatest(profile.getUserId()).orElse(null);
        if (latest == null) {
            // TDEE needs a weight
            return profileMapper.toResponse(profile, age, null, null, null, allergens, excludedFoods);
        }

        // Body fat % is only used when the LATEST check-in has it (an old value may be outdated)
        Double bodyFatPct = latest.bodyFatPct() != null ? latest.bodyFatPct().doubleValue() : null;
        EnergyTargets energy = TdeeCalculator.calculate(
                profile.getSex(), latest.weightKg().doubleValue(), profile.getHeightCm().doubleValue(),
                bodyFatPct, age, profile.getActivityLevel(), profile.getGoal(),
                profile.getTrainingExperience(), profile.getTrainingType(), profile.getCustomTargetKcal());

        return profileMapper.toResponse(profile, age, latest.weightKg(), latest.bodyFatPct(), energy, allergens, excludedFoods);
    }

    private List<String> allergensInDisplayOrder(Set<String> codes) {
        if (codes.isEmpty()) {
            return List.of();
        }
        return allergenRepository.findAllByOrderBySortOrderAsc().stream()
                .map(Allergen::getCode)
                .filter(codes::contains)
                .toList();
    }

    private static LocalDate today() {
        return LocalDate.now(AppTime.ZONE);
    }
}
