package dev.gnaspham1218.maifit.backend.payment.dto;

// Public (no login): the landing page shows the real price and limits from the server's config,
// so changing them never leaves an old number on the page. Nothing about any user.
public record PricingResponse(
        int price,              // VND for one purchase
        int days,               // Premium days one purchase adds
        int freeDailyScans,
        int premiumDailyScans,
        int freeDailyChats,
        int premiumDailyChats
) {
}
