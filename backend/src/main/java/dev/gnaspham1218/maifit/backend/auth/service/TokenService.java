package dev.gnaspham1218.maifit.backend.auth.service;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

// Opaque random tokens for email links (and refresh tokens later).
// The raw value goes to the user; only its SHA-256 hash is stored in the DB.
@Component
public class TokenService {

    private static final int TOKEN_BYTES = 32; // 256 bits: impossible to guess

    private final SecureRandom random = new SecureRandom();

    public record GeneratedToken(String raw, String hash) {
    }

    public GeneratedToken generate() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        // URL-safe Base64 without padding: can go straight into a link
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return new GeneratedToken(raw, hash(raw));
    }

    public String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e); // never happens on a standard JDK
        }
    }
}
