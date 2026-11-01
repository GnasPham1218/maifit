package dev.gnaspham1218.maifit.backend.auth.service;

import dev.gnaspham1218.maifit.backend.config.JwtConfig;
import dev.gnaspham1218.maifit.backend.config.JwtProperties;
import dev.gnaspham1218.maifit.backend.user.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Plain unit test: no Spring context, no database
class JwtServiceTest {

    private static final String SECRET = Base64.getEncoder().encodeToString(new byte[32]); // test-only key

    private final JwtConfig config = new JwtConfig();
    private final JwtProperties props = new JwtProperties(SECRET, "maifit", Duration.ofMinutes(15));
    private final JwtService jwtService = new JwtService(config.jwtEncoder(props), props);
    private final JwtDecoder decoder = config.jwtDecoder(props);

    @Test
    void generatedTokenIsAcceptedByDecoder() {
        User user = new User("nam@gmail.com", "nam", "hash", "Nam");
        ReflectionTestUtils.setField(user, "id", 42L);

        String token = jwtService.generateAccessToken(user).value();
        Jwt jwt = decoder.decode(token);

        assertThat(jwt.getSubject()).isEqualTo("42");
        assertThat(jwt.getClaimAsStringList("roles")).isEqualTo(List.of("USER"));
        assertThat(jwt.getClaimAsString("iss")).isEqualTo("maifit");
    }

    @Test
    void tamperedTokenIsRejected() {
        User user = new User("nam@gmail.com", "nam", "hash", "Nam");
        ReflectionTestUtils.setField(user, "id", 42L);
        String token = jwtService.generateAccessToken(user).value();

        String tampered = token.substring(0, token.length() - 2) + (token.endsWith("A") ? "BB" : "AA");

        assertThatThrownBy(() -> decoder.decode(tampered)).isInstanceOf(JwtException.class);
    }
}
