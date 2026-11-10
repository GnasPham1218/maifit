package dev.gnaspham1218.maifit.backend.payment.provider;

import java.time.Instant;

// What we ask a gateway to collect
public record NewPayment(
        long orderCode,
        int amount,          // VND
        String description,  // transfer content; gateways may limit its length or rewrite it
        Instant expiresAt,
        String returnUrl,    // where a hosted checkout page would send the user back (unused by our own QR page)
        String cancelUrl
) {
}
