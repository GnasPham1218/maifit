package dev.gnaspham1218.maifit.backend.user.controller;

import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.user.dto.UpdateAccentRequest;
import dev.gnaspham1218.maifit.backend.user.dto.UserResponse;
import dev.gnaspham1218.maifit.backend.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users") // full path: /api/users
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // PUT /api/users/me/accent-color {"accentColor": "PURPLE"}: only the caller's own account (id from the token)
    @PutMapping("/me/accent-color")
    public ApiResponse<UserResponse> changeAccentColor(@AuthenticationPrincipal Jwt jwt,
                                                       @Valid @RequestBody UpdateAccentRequest request) {
        Long userId = Long.valueOf(jwt.getSubject());
        return ApiResponse.ok(userService.changeAccentColor(userId, request.accentColor()));
    }
}
