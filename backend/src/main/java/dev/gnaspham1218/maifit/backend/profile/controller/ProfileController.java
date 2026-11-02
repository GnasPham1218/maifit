package dev.gnaspham1218.maifit.backend.profile.controller;

import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.profile.dto.ProfileRequest;
import dev.gnaspham1218.maifit.backend.profile.dto.ProfileResponse;
import dev.gnaspham1218.maifit.backend.profile.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// No user id in the URL: always the logged-in user's own profile (nothing to guess -> no IDOR)
@RestController
@RequestMapping("/profile") // full path: /api/profile
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    public ApiResponse<ProfileResponse> get(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(profileService.get(userId(jwt)));
    }

    @PutMapping
    public ApiResponse<ProfileResponse> upsert(@AuthenticationPrincipal Jwt jwt,
                                               @Valid @RequestBody ProfileRequest request) {
        return ApiResponse.ok(profileService.upsert(userId(jwt), request));
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
