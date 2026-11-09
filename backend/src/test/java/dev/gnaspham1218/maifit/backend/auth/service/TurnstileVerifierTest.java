package dev.gnaspham1218.maifit.backend.auth.service;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.config.TurnstileProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

// MockRestServiceServer plays the role of Cloudflare: no real network call is made
class TurnstileVerifierTest {

    private static final String VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer cloudflare = MockRestServiceServer.bindTo(builder).build();
    private final TurnstileVerifier verifier = new TurnstileVerifier(
            new TurnstileProperties("test-secret", VERIFY_URL, Duration.ofSeconds(5)), builder);

    @Test
    void acceptsTokenThatCloudflareConfirms() {
        cloudflare.expect(requestTo(VERIFY_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().formDataContains(Map.of("secret", "test-secret", "response", "good-token")))
                .andRespond(withSuccess("{\"success\":true,\"error-codes\":[]}", MediaType.APPLICATION_JSON));

        assertThatCode(() -> verifier.verify("good-token")).doesNotThrowAnyException();
        cloudflare.verify(); // Cloudflare was really asked
    }

    @Test
    void rejectsTokenThatCloudflareRefuses() {
        cloudflare.expect(requestTo(VERIFY_URL))
                .andRespond(withSuccess("{\"success\":false,\"error-codes\":[\"invalid-input-response\"]}",
                        MediaType.APPLICATION_JSON));

        assertFailsWith(ErrorCode.CAPTCHA_INVALID, "bad-token");
    }

    @Test
    void rejectsMissingTokenWithoutCallingCloudflare() {
        assertFailsWith(ErrorCode.CAPTCHA_INVALID, null);
        assertFailsWith(ErrorCode.CAPTCHA_INVALID, "   ");
        assertFailsWith(ErrorCode.CAPTCHA_INVALID, "x".repeat(2049));
        cloudflare.verify(); // no request was expected, so none may have been sent
    }

    @Test
    void failsClosedWhenCloudflareIsDown() {
        // Only ONE request is expected: an HTTP error from Cloudflare is not retried
        cloudflare.expect(requestTo(VERIFY_URL)).andRespond(withServerError());

        assertFailsWith(ErrorCode.CAPTCHA_UNAVAILABLE, "any-token");
    }

    @Test
    void retriesOnceAfterNetworkError() {
        cloudflare.expect(requestTo(VERIFY_URL)).andRespond(withException(new SocketTimeoutException("timed out")));
        cloudflare.expect(requestTo(VERIFY_URL))
                .andRespond(withSuccess("{\"success\":true}", MediaType.APPLICATION_JSON));

        assertThatCode(() -> verifier.verify("good-token")).doesNotThrowAnyException();
        cloudflare.verify(); // exactly two calls were made
    }

    @Test
    void failsClosedWhenNetworkErrorRepeats() {
        cloudflare.expect(requestTo(VERIFY_URL)).andRespond(withException(new SocketTimeoutException("timed out")));
        cloudflare.expect(requestTo(VERIFY_URL)).andRespond(withException(new SocketTimeoutException("timed out")));

        assertFailsWith(ErrorCode.CAPTCHA_UNAVAILABLE, "any-token");
        cloudflare.verify();
    }

    @Test
    void refusesToStartWithoutSecretKey() {
        TurnstileProperties noSecret = new TurnstileProperties("", VERIFY_URL, Duration.ofSeconds(5));

        assertThatThrownBy(() -> new TurnstileVerifier(noSecret, RestClient.builder()))
                .isInstanceOf(IllegalStateException.class);
    }

    private void assertFailsWith(ErrorCode expected, String token) {
        assertThatThrownBy(() -> verifier.verify(token))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(expected));
    }
}
