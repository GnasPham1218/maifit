package dev.gnaspham1218.maifit.backend.auth.service;

import dev.gnaspham1218.maifit.backend.auth.dto.LoginRequest;
import dev.gnaspham1218.maifit.backend.auth.dto.LoginResponse;
import dev.gnaspham1218.maifit.backend.auth.dto.RegisterRequest;
import dev.gnaspham1218.maifit.backend.auth.entity.EmailToken;
import dev.gnaspham1218.maifit.backend.auth.entity.EmailTokenType;
import dev.gnaspham1218.maifit.backend.auth.repository.EmailTokenRepository;
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
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final EmailSender emailSender;
    private final AuthProperties authProperties;
    private final UserMapper userMapper;
    private final JwtService jwtService;

    // A real BCrypt hash used when the email does not exist, so that login takes the same time either way
    private String dummyPasswordHash;

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

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest req) {
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

        JwtService.AccessToken accessToken = jwtService.generateAccessToken(user);
        return new LoginResponse(accessToken.value(), accessToken.expiresAt(), userMapper.toResponse(user));
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
