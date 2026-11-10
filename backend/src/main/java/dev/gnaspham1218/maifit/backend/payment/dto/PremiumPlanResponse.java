package dev.gnaspham1218.maifit.backend.payment.dto;

import java.time.Instant;

// Everything the Premium page needs in one call
public record PremiumPlanResponse(
        boolean premium,
        Instant premiumUntil,               // null = never bought; may be in the past
        int price,                          // VND for one purchase
        int days,                           // Premium days one purchase adds
        int freeDailyScans,                 // photo recognitions per day on the free plan
        int premiumDailyScans,
        PaymentOrderResponse pendingOrder   // an order still waiting for payment, so a reload keeps the same QR
) {
}
