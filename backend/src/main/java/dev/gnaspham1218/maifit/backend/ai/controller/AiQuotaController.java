package dev.gnaspham1218.maifit.backend.ai.controller;

import dev.gnaspham1218.maifit.backend.ai.dto.AiQuotasResponse;
import dev.gnaspham1218.maifit.backend.ai.entity.AiFeature;
import dev.gnaspham1218.maifit.backend.ai.service.AiUsageService;
import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ai") // full path: /api/ai
@RequiredArgsConstructor
public class AiQuotaController {

    private final AiUsageService aiUsageService;

    // GET /api/ai/quota: calls left today for every AI feature (read only, uses no call)
    @GetMapping("/quota")
    public ApiResponse<AiQuotasResponse> quota(@AuthenticationPrincipal Jwt jwt) {
        Long userId = Long.valueOf(jwt.getSubject()); // same as the other controllers
        return ApiResponse.ok(new AiQuotasResponse(
                aiUsageService.quota(userId, AiFeature.FOOD_VISION),
                aiUsageService.quota(userId, AiFeature.CHAT)));
    }
}
