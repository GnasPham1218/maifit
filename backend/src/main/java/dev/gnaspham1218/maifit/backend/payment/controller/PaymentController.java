package dev.gnaspham1218.maifit.backend.payment.controller;

import dev.gnaspham1218.maifit.backend.common.response.ApiResponse;
import dev.gnaspham1218.maifit.backend.payment.dto.PaymentOrderResponse;
import dev.gnaspham1218.maifit.backend.payment.dto.PremiumPlanResponse;
import dev.gnaspham1218.maifit.backend.payment.dto.PricingResponse;
import dev.gnaspham1218.maifit.backend.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/payments") // full path: /api/payments
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService service;

    // GET /api/payments/pricing: public (landing page), price and daily limits only
    @GetMapping("/pricing")
    public ApiResponse<PricingResponse> pricing() {
        return ApiResponse.ok(service.pricing());
    }

    // Premium state of the caller, the price, and an order still waiting for payment (if any)
    @GetMapping("/plan")
    public ApiResponse<PremiumPlanResponse> plan(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(service.plan(userId(jwt)));
    }

    // No request body: price and duration come from the server's config, never from the client
    @PostMapping("/checkout")
    public ApiResponse<PaymentOrderResponse> checkout(@AuthenticationPrincipal Jwt jwt) {
        return ApiResponse.ok(service.checkout(userId(jwt)));
    }

    // Polled by the payment page; reads our database only. Another user's order answers 404.
    @GetMapping("/orders/{orderCode}")
    public ApiResponse<PaymentOrderResponse> get(@AuthenticationPrincipal Jwt jwt, @PathVariable long orderCode) {
        return ApiResponse.ok(service.get(userId(jwt), orderCode));
    }

    // "I have paid": checks the order with the gateway right now (fallback when the webhook is late or lost)
    @PostMapping("/orders/{orderCode}/refresh")
    public ApiResponse<PaymentOrderResponse> refresh(@AuthenticationPrincipal Jwt jwt, @PathVariable long orderCode) {
        return ApiResponse.ok(service.refresh(userId(jwt), orderCode));
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
