package dev.gnaspham1218.maifit.backend.ai.service;

import dev.gnaspham1218.maifit.backend.ai.entity.AiFeature;
import dev.gnaspham1218.maifit.backend.ai.entity.AiUsage;
import dev.gnaspham1218.maifit.backend.ai.entity.AiUsageId;
import dev.gnaspham1218.maifit.backend.ai.repository.AiUsageRepository;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZonedDateTime;

@Service
public class AiUsageService {

    private final AiUsageRepository repo;
    private final int foodVisionLimit;
    private final int chatLimit;

    public AiUsageService(
            AiUsageRepository repo,
            @Value("${app.ai.daily-limit.food-vision:10}") int foodVisionLimit,
            @Value("${app.ai.daily-limit.chat:20}") int chatLimit) {
        this.repo = repo;
        this.foodVisionLimit = foodVisionLimit;
        this.chatLimit = chatLimit;
    }

    /**
     * Deduct 1 usage before calling the AI. Throws 429 if quota exhausted.
     * Returns how many calls are left today, so the UI can show it.
     */
    @Transactional
    public int acquire(Long userId, AiFeature feature) {
        LocalDate today = ZonedDateTime.now(AppTime.ZONE).toLocalDate();
        int limit = limitFor(feature);
        int affected = repo.tryIncrement(userId, today, feature.name(), limit);
        if (affected == 0) {
            throw new AppException(ErrorCode.AI_DAILY_LIMIT,
                    "Daily AI limit reached for " + feature + " (" + limit + "/day)");
        }
        int used = repo.findById(new AiUsageId(userId, today, feature))
                .map(AiUsage::getCount)
                .orElse(limit);
        return Math.max(limit - used, 0);
    }

    /** Refund 1 usage when an AI call fails. */
    @Transactional
    public void refund(Long userId, AiFeature feature) {
        LocalDate today = ZonedDateTime.now(AppTime.ZONE).toLocalDate();
        repo.refund(userId, today, feature.name());
    }

    private int limitFor(AiFeature feature) {
        return switch (feature) {
            case FOOD_VISION -> foodVisionLimit;
            case CHAT        -> chatLimit;
        };
    }
}
