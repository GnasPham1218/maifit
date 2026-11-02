package dev.gnaspham1218.maifit.backend.profile.service;

import dev.gnaspham1218.maifit.backend.body.dto.BodyCheckinResponse;
import dev.gnaspham1218.maifit.backend.body.service.BodyCheckinService;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import dev.gnaspham1218.maifit.backend.profile.dto.EnergyTargets;
import dev.gnaspham1218.maifit.backend.profile.dto.ProfileRequest;
import dev.gnaspham1218.maifit.backend.profile.dto.ProfileResponse;
import dev.gnaspham1218.maifit.backend.profile.entity.Profile;
import dev.gnaspham1218.maifit.backend.profile.mapper.ProfileMapper;
import dev.gnaspham1218.maifit.backend.profile.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ProfileService {

    static final int MIN_AGE = 13;
    static final int MAX_AGE = 100;

    private final ProfileRepository profileRepository;
    private final BodyCheckinService bodyCheckinService;
    private final ProfileMapper profileMapper;

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

        Profile profile = profileRepository.findById(userId)
                .map(existing -> {
                    existing.update(req.sex(), req.birthDate(), req.heightCm(),
                            req.activityLevel(), req.goal(), req.customTargetKcal());
                    return existing; // managed entity: saved automatically at commit (dirty checking)
                })
                .orElseGet(() -> profileRepository.save(new Profile(userId, req.sex(), req.birthDate(),
                        req.heightCm(), req.activityLevel(), req.goal(), req.customTargetKcal())));

        return toResponse(profile);
    }

    private ProfileResponse toResponse(Profile profile) {
        int age = TdeeCalculator.ageOn(profile.getBirthDate(), today());
        BodyCheckinResponse latest = bodyCheckinService.findLatest(profile.getUserId()).orElse(null);
        if (latest == null) {
            return profileMapper.toResponse(profile, age, null, null); // TDEE needs a weight
        }

        // Body fat % is only used when the LATEST check-in has it (an old value may be outdated)
        Double bodyFatPct = latest.bodyFatPct() != null ? latest.bodyFatPct().doubleValue() : null;
        EnergyTargets energy = TdeeCalculator.calculate(
                profile.getSex(), latest.weightKg().doubleValue(), profile.getHeightCm().doubleValue(),
                bodyFatPct, age, profile.getActivityLevel(), profile.getGoal(), profile.getCustomTargetKcal());

        return profileMapper.toResponse(profile, age, latest.weightKg(), energy);
    }

    private static LocalDate today() {
        return LocalDate.now(AppTime.ZONE);
    }
}
