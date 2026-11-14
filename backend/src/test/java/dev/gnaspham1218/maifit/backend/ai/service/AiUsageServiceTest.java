package dev.gnaspham1218.maifit.backend.ai.service;

import dev.gnaspham1218.maifit.backend.ai.dto.AiQuota;
import dev.gnaspham1218.maifit.backend.ai.entity.AiFeature;
import dev.gnaspham1218.maifit.backend.ai.repository.AiUsageRepository;
import dev.gnaspham1218.maifit.backend.user.service.PremiumService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Daily limits by plan (no database: the repository is mocked)
class AiUsageServiceTest {

    private static final long FREE_USER = 1L;
    private static final long PREMIUM_USER = 2L;

    private AiUsageRepository repo;
    private AiUsageService service;

    @BeforeEach
    void setUp() {
        repo = mock(AiUsageRepository.class);
        PremiumService premiumService = mock(PremiumService.class);
        when(premiumService.isPremium(FREE_USER)).thenReturn(false);
        when(premiumService.isPremium(PREMIUM_USER)).thenReturn(true);
        when(repo.findById(any())).thenReturn(Optional.empty()); // nothing used yet today
        service = new AiUsageService(repo, premiumService, 3, 30, 5, 20);
    }

    @Test
    void chatLimitDependsOnThePlan() {
        assertThat(service.quota(FREE_USER, AiFeature.CHAT)).isEqualTo(new AiQuota(5, 5));
        assertThat(service.quota(PREMIUM_USER, AiFeature.CHAT)).isEqualTo(new AiQuota(20, 20));
    }

    @Test
    void acquireUsesThePlanLimit() {
        when(repo.tryIncrement(eq(PREMIUM_USER), any(), eq("CHAT"), anyInt())).thenReturn(1);

        service.acquire(PREMIUM_USER, AiFeature.CHAT);

        verify(repo).tryIncrement(eq(PREMIUM_USER), any(), eq("CHAT"), eq(20));
    }

    @Test
    void readingTheQuotaUsesNothing() {
        service.quota(FREE_USER, AiFeature.CHAT);

        verify(repo, never()).tryIncrement(any(), any(), any(), anyInt());
    }
}
