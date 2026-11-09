package dev.gnaspham1218.maifit.backend.auth.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.config.TurnstileProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;

// Checks a Cloudflare Turnstile token with Cloudflare's siteverify API.
// The browser widget alone proves nothing: a bot can call our API directly,
// so the server must ask Cloudflare whether the token is real.
@Component
public class TurnstileVerifier {

    private static final Logger log = LoggerFactory.getLogger(TurnstileVerifier.class);

    // Cloudflare's documented maximum token length; anything longer is not a real token
    private static final int MAX_TOKEN_LENGTH = 2048;

    private final TurnstileProperties properties;
    private final RestClient restClient;

    @Autowired
    public TurnstileVerifier(TurnstileProperties properties) {
        this(properties, RestClient.builder().requestFactory(requestFactory(properties.timeout())));
    }

    // Tests pass a builder bound to a mock server instead of the real Cloudflare
    TurnstileVerifier(TurnstileProperties properties, RestClient.Builder restClientBuilder) {
        // Fail at startup, not at the first sign-up, when the key is missing
        if (properties.secretKey() == null || properties.secretKey().isBlank()) {
            throw new IllegalStateException("app.turnstile.secret-key (TURNSTILE_SECRET_KEY) is not set");
        }
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    // Returns normally when the token is valid; throws AppException otherwise
    public void verify(String token) {
        // No need to ask Cloudflare about an obviously missing or fake token
        if (token == null || token.isBlank() || token.length() > MAX_TOKEN_LENGTH) {
            throw new AppException(ErrorCode.CAPTCHA_INVALID);
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", properties.secretKey());
        form.add("response", token);

        SiteverifyResponse result;
        try {
            result = callSiteverifyWithOneRetry(form);
        } catch (RestClientException e) {
            // Fail closed: if we cannot reach Cloudflare (timeout, 5xx), the request is refused.
            // Letting it through would turn "Cloudflare is slow" into "the CAPTCHA is off".
            log.error("Turnstile siteverify call failed: {}", e.getMessage());
            throw new AppException(ErrorCode.CAPTCHA_UNAVAILABLE);
        }

        if (result == null || !result.success()) {
            // error-codes explain why, e.g. "timeout-or-duplicate" (token reused or older than 5 minutes)
            log.warn("Turnstile rejected a token: {}", result == null ? "empty response" : result.errorCodes());
            throw new AppException(ErrorCode.CAPTCHA_INVALID);
        }
    }

    private SiteverifyResponse callSiteverifyWithOneRetry(MultiValueMap<String, String> form) {
        try {
            return callSiteverify(form);
        } catch (ResourceAccessException e) {
            // Network problem (timeout, dropped connection): usually gone on a fresh attempt.
            // Only network errors are retried; a real "no" from Cloudflare is never retried.
            // If the first call did reach Cloudflare, the retry gets "timeout-or-duplicate"
            // and the user simply solves a new CAPTCHA.
            log.warn("Turnstile siteverify network error, retrying once: {}", e.getMessage());
            return callSiteverify(form);
        }
    }

    private SiteverifyResponse callSiteverify(MultiValueMap<String, String> form) {
        return restClient.post()
                .uri(properties.verifyUrl())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(SiteverifyResponse.class);
    }

    // Without a timeout, a hanging Cloudflare call would hold a server thread forever
    private static JdkClientHttpRequestFactory requestFactory(Duration timeout) {
        HttpClient httpClient = HttpClient.newBuilder()
                // One small request per sign-up, so HTTP/2 brings nothing here; and a pooled
                // HTTP/2 connection that the other side silently closed can hang until the timeout
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(timeout)
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(timeout);
        return factory;
    }

    // Only the fields we use; Cloudflare also sends challenge_ts, hostname, action, ...
    @JsonIgnoreProperties(ignoreUnknown = true)
    record SiteverifyResponse(
            boolean success,
            @JsonProperty("error-codes") List<String> errorCodes
    ) {
    }
}
