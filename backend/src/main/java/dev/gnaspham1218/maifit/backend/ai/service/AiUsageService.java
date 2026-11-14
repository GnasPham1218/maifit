package dev.gnaspham1218.maifit.backend.ai.service;

import dev.gnaspham1218.maifit.backend.ai.dto.AiQuota;
import dev.gnaspham1218.maifit.backend.ai.dto.TokenUsage;
import dev.gnaspham1218.maifit.backend.ai.entity.AiFeature;
import dev.gnaspham1218.maifit.backend.ai.entity.AiUsage;
import dev.gnaspham1218.maifit.backend.ai.entity.AiUsageId;
import dev.gnaspham1218.maifit.backend.ai.repository.AiUsageRepository;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import dev.gnaspham1218.maifit.backend.user.service.PremiumService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZonedDateTime;

@Service
public class AiUsageService {

    private final AiUsageRepository repo;
    private final PremiumService premiumService;
    private final int foodVisionLimit;
    private final int foodVisionPremiumLimit;
    private final int chatLimit;
    private final int chatPremiumLimit;

    public AiUsageService(
            AiUsageRepository repo,
            PremiumService premiumService,
            @Value("${app.ai.daily-limit.food-vision:3}") int foodVisionLimit,
            @Value("${app.ai.daily-limit.food-vision-premium:10}") int foodVisionPremiumLimit,
            @Value("${app.ai.daily-limit.chat:2}") int chatLimit,
            @Value("${app.ai.daily-limit.chat-premium:5}") int chatPremiumLimit) {
        this.repo = repo;
        this.premiumService = premiumService;
        this.foodVisionLimit = foodVisionLimit;
        this.foodVisionPremiumLimit = foodVisionPremiumLimit;
        this.chatLimit = chatLimit;
        this.chatPremiumLimit = chatPremiumLimit;
    }

    public int freeFoodVisionLimit() {
        return foodVisionLimit;
    }

    public int premiumFoodVisionLimit() {
        return foodVisionPremiumLimit;
    }

    public int freeChatLimit() {
        return chatLimit;
    }

    public int premiumChatLimit() {
        return chatPremiumLimit;
    }

    /** Today's limit and what is left, without using anything (for the UI). */
    @Transactional(readOnly = true)
    public AiQuota quota(Long userId, AiFeature feature) {
        LocalDate today = ZonedDateTime.now(AppTime.ZONE).toLocalDate();
        int limit = limitFor(userId, feature);
        int used = repo.findById(new AiUsageId(userId, today, feature))
                .map(AiUsage::getCount)
                .orElse(0);
        return new AiQuota(limit, Math.max(limit - used, 0));
    }

    /**
     * Deduct 1 usage before calling the AI. Throws 429 if quota exhausted.
     * Returns how many calls are left today, so the UI can show it.
     */
    @Transactional
    public int acquire(Long userId, AiFeature feature) {
        LocalDate today = ZonedDateTime.now(AppTime.ZONE).toLocalDate();
        int limit = limitFor(userId, feature);
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

    /** Adds the tokens Gemini billed for one call (to measure the real cost per call). */
    @Transactional
    public void recordTokens(Long userId, AiFeature feature, TokenUsage usage) {
        if (usage.input() == 0 && usage.output() == 0) {
            return; // the provider sent no usage
        }
        LocalDate today = ZonedDateTime.now(AppTime.ZONE).toLocalDate();
        repo.addTokens(userId, today, feature.name(), usage.input(), usage.output());
    }

    // The limit is looked up on every call, so Premium applies (and ends) without any extra step:
    // a paid order raises the limit right away, an ended Premium falls back to the free limit.
    private int limitFor(Long userId, AiFeature feature) {
        return switch (feature) {
            case FOOD_VISION -> premiumService.isPremium(userId) ? foodVisionPremiumLimit : foodVisionLimit;
            case CHAT        -> premiumService.isPremium(userId) ? chatPremiumLimit : chatLimit;
        };
    }
}
