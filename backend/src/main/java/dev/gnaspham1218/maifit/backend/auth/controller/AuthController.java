package dev.gnaspham1218.maifit.backend.auth.controller;

import dev.gnaspham1218.maifit.backend.auth.dto.LoginRequest;
import dev.gnaspham1218.maifit.backend.auth.dto.LoginResponse;
import dev.gnaspham1218.maifit.backend.auth.dto.RegisterRequest;
import dev.gnaspham1218.maifit.backend.auth.dto.VerifyEmailRequest;
import dev.gnaspham1218.maifit.backend.auth.service.AuthService;
import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.user.dto.UserResponse;
import dev.gnaspham1218.maifit.backend.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth") // full path: /api/auth/... (context path /api)
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Registered. Please check your email to verify your account", user));
    }

    @PostMapping("/verify-email")
    public ApiResponse<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request.token());
        return ApiResponse.ok("Email verified", null);
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    // Not in PUBLIC_ENDPOINTS: Spring Security has already validated the JWT before we get here
    @GetMapping("/me")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal Jwt jwt) {
        Long userId = Long.valueOf(jwt.getSubject()); // "sub" claim = user id (see JwtService)
        return ApiResponse.ok(userService.getById(userId));
    }
}
