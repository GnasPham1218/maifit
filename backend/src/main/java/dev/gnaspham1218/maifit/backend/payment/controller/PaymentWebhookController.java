package dev.gnaspham1218.maifit.backend.payment.controller;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.payment.entity.PaymentProviderType;
import dev.gnaspham1218.maifit.backend.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;

// Called by the payment gateway's servers, not by a browser: there is no JWT here (the path is
// public in SecurityConfig). What protects it is the provider's own check (payOS: HMAC signature).
@RestController
@RequestMapping("/payments/webhook") // full path: /api/payments/webhook
@RequiredArgsConstructor
public class PaymentWebhookController {

    private final PaymentService service;

    // POST /api/payments/webhook/payos
    // The body is taken as raw text: the signature covers what was sent, and each provider parses its own format.
    // Any 2xx tells the gateway "received"; an invalid signature answers 400.
    @PostMapping("/{provider}")
    public ApiResponse<Void> receive(@PathVariable String provider,
                                     @RequestBody String rawBody,
                                     @RequestHeader HttpHeaders headers) {
        service.handleWebhook(parse(provider), rawBody, headers);
        return ApiResponse.ok(null);
    }

    private static PaymentProviderType parse(String provider) {
        try {
            return PaymentProviderType.valueOf(provider.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.NOT_FOUND);
        }
    }
}
