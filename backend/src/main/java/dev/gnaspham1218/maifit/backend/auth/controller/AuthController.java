package dev.gnaspham1218.maifit.backend.auth.controller;

import dev.gnaspham1218.maifit.backend.auth.dto.LoginRequest;
import dev.gnaspham1218.maifit.backend.auth.dto.LoginResponse;
import dev.gnaspham1218.maifit.backend.auth.dto.RegisterRequest;
import dev.gnaspham1218.maifit.backend.auth.dto.VerifyEmailRequest;
import dev.gnaspham1218.maifit.backend.auth.service.AuthService;
import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.config.AuthProperties;
import dev.gnaspham1218.maifit.backend.user.dto.UserResponse;
import dev.gnaspham1218.maifit.backend.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/auth") // full path: /api/auth/... (context path /api)
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_COOKIE = "refresh_token";

    private final AuthService authService;
    private final UserService userService;
    private final AuthProperties authProperties;

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
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        return withRefreshCookie(authService.login(request));
    }

    // The refresh token is read from the HttpOnly cookie, never from the body
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        return withRefreshCookie(authService.refresh(refreshToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie("", Duration.ZERO).toString()) // delete cookie
                .body(ApiResponse.ok("Logged out", null));
    }

    // Not in PUBLIC_ENDPOINTS: Spring Security has already validated the JWT before we get here
    @GetMapping("/me")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal Jwt jwt) {
        Long userId = Long.valueOf(jwt.getSubject()); // "sub" claim = user id (see JwtService)
        return ApiResponse.ok(userService.getById(userId));
    }

    private ResponseEntity<ApiResponse<LoginResponse>> withRefreshCookie(AuthService.AuthResult result) {
        ResponseCookie cookie = refreshCookie(result.refreshToken(), authProperties.refreshTokenTtl());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok(result.response()));
    }

    private ResponseCookie refreshCookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)                                  // JavaScript cannot read it (XSS cannot steal it)
                .secure(authProperties.refreshCookieSecure())    // sent over HTTPS only
                .sameSite("Strict")                              // never sent by requests coming from other sites (CSRF)
                .path(authProperties.refreshCookiePath())        // only sent to /api/auth/*, not to every API call
                .maxAge(maxAge)
                .build();
    }
}
