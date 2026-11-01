package dev.gnaspham1218.maifit.backend.auth.service;

import dev.gnaspham1218.maifit.backend.auth.dto.LoginRequest;
import dev.gnaspham1218.maifit.backend.auth.dto.LoginResponse;
import dev.gnaspham1218.maifit.backend.auth.dto.RegisterRequest;
import dev.gnaspham1218.maifit.backend.auth.entity.EmailToken;
import dev.gnaspham1218.maifit.backend.auth.entity.EmailTokenType;
import dev.gnaspham1218.maifit.backend.auth.entity.RefreshToken;
import dev.gnaspham1218.maifit.backend.auth.repository.EmailTokenRepository;
import dev.gnaspham1218.maifit.backend.auth.repository.RefreshTokenRepository;
import dev.gnaspham1218.maifit.backend.common.email.EmailSender;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.config.AuthProperties;
import dev.gnaspham1218.maifit.backend.user.dto.UserResponse;
import dev.gnaspham1218.maifit.backend.user.entity.User;
import dev.gnaspham1218.maifit.backend.user.mapper.UserMapper;
import dev.gnaspham1218.maifit.backend.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final EmailTokenRepository emailTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final EmailSender emailSender;
    private final AuthProperties authProperties;
    private final UserMapper userMapper;
    private final JwtService jwtService;

    // A real BCrypt hash used when the email does not exist, so that login takes the same time either way
    private String dummyPasswordHash;

    // What the controller needs after login/refresh: the JSON body + the raw refresh token for the cookie
    public record AuthResult(LoginResponse response, String refreshToken) {
    }

    @PostConstruct
    void initDummyHash() {
        dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public UserResponse register(RegisterRequest req) {
        String email = normalize(req.email());
        String username = normalize(req.username());

        // Friendly errors for the common case...
        if (userRepository.existsByEmail(email)) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        if (userRepository.existsByUsername(username)) {
            throw new AppException(ErrorCode.USERNAME_ALREADY_EXISTS);
        }

        User user = new User(email, username, passwordEncoder.encode(req.password()), req.displayName().trim());
        try {
            // ...and the UNIQUE constraints in the DB as the final guard
            // (two requests with the same email at the same moment both pass the checks above)
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw duplicateError(e);
        }

        sendVerificationEmail(user, Instant.now());
        return userMapper.toResponse(user);
    }

    @Transactional
    public AuthResult login(LoginRequest req) {
        User user = userRepository.findByEmail(normalize(req.email())).orElse(null);

        // Always run BCrypt once, even when the user does not exist: otherwise "unknown email"
        // answers faster than "wrong password" and an attacker can tell which emails are registered.
        String hash = (user != null && user.getPasswordHash() != null) ? user.getPasswordHash() : dummyPasswordHash;
        boolean passwordMatches = passwordEncoder.matches(req.password(), hash);

        if (user == null || user.getPasswordHash() == null || !passwordMatches) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS); // same error for wrong email and wrong password
        }
        // Checked only after the password is correct, so it does not reveal which emails exist
        if (!user.isEmailVerified()) {
            throw new AppException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        return issueTokens(user, Instant.now());
    }

    // Exchange a valid refresh token for a new access token AND a new refresh token (rotation).
    // noRollbackFor: when reuse is detected we revoke every session and then throw;
    // without it, the exception would roll back that revocation.
    @Transactional(noRollbackFor = AppException.class)
    public AuthResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        Instant now = Instant.now();
        RefreshToken current = refreshTokenRepository.findForUpdateByTokenHash(tokenService.hash(rawRefreshToken))
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        if (current.isRevoked()) {
            // This token was already exchanged once. Someone is replaying an old token:
            // we cannot tell the real user from the thief, so log out every session of this user.
            refreshTokenRepository.revokeAllForUser(current.getUser().getId(), now);
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        if (!current.isActive(now)) { // expired
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        current.revoke(now); // the old token can never be used again
        return issueTokens(current.getUser(), now);
    }

    // Logout never fails: unknown or already revoked tokens are simply ignored
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(tokenService.hash(rawRefreshToken))
                .ifPresent(t -> t.revoke(Instant.now()));
    }

    private AuthResult issueTokens(User user, Instant now) {
        TokenService.GeneratedToken refresh = tokenService.generate();
        refreshTokenRepository.save(new RefreshToken(user, refresh.hash(), now.plus(authProperties.refreshTokenTtl())));

        JwtService.AccessToken accessToken = jwtService.generateAccessToken(user);
        LoginResponse response = new LoginResponse(accessToken.value(), accessToken.expiresAt(), userMapper.toResponse(user));
        return new AuthResult(response, refresh.raw());
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        Instant now = Instant.now();
        EmailToken token = emailTokenRepository.findByTokenHash(tokenService.hash(rawToken))
                .filter(t -> t.getType() == EmailTokenType.VERIFY && t.isUsable(now))
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_TOKEN));

        token.markUsed(now);
        token.getUser().markEmailVerified(); // saved automatically at commit (dirty checking)
    }

    private void sendVerificationEmail(User user, Instant now) {
        // Only the newest link works
        emailTokenRepository.invalidateAll(user.getId(), EmailTokenType.VERIFY, now);

        TokenService.GeneratedToken token = tokenService.generate();
        emailTokenRepository.save(new EmailToken(
                user, token.hash(), EmailTokenType.VERIFY, now.plus(authProperties.verifyTokenTtl())));

        String link = authProperties.frontendUrl() + "/verify-email?token=" + token.raw();
        emailSender.sendVerificationEmail(user.getEmail(), user.getDisplayName(), link);
    }

    private static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private static AppException duplicateError(DataIntegrityViolationException e) {
        String detail = String.valueOf(e.getMostSpecificCause().getMessage());
        return detail.contains("uq_users_username")
                ? new AppException(ErrorCode.USERNAME_ALREADY_EXISTS)
                : new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
    }
}
