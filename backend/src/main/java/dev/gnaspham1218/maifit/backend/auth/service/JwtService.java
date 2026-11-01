package dev.gnaspham1218.maifit.backend.auth.service;

import dev.gnaspham1218.maifit.backend.config.JwtProperties;
import dev.gnaspham1218.maifit.backend.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtEncoder jwtEncoder;
    private final JwtProperties props;

    public record AccessToken(String value, Instant expiresAt) {
    }

    public AccessToken generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(props.accessTokenTtl());

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(props.issuer())
                .subject(String.valueOf(user.getId()))   // user id, not email: email can change
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim("roles", List.of(user.getRole().name()))
                .build();

        // The header must say HS256: without it the encoder looks for an RSA key and fails
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();

        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new AccessToken(token, expiresAt);
    }
}
