package dev.gnaspham1218.maifit.backend.payment.dto;

import java.time.Instant;

// One order as the payment page sees it. The transfer details are only present while the order
// can still be paid (state PENDING); the internal id and the gateway's reference never leave the server.
public record PaymentOrderResponse(
        long orderCode,
        int amount,            // VND
        int premiumDays,
        State state,
        Instant expiresAt,
        Instant paidAt,
        String qrSvg,          // QR image as SVG markup; the page shows it through an <img> data URL
        String bankBin,
        String accountNumber,
        String accountName,
        String description     // transfer content
) {

    // EXPIRED is computed (PENDING past its expiry), it is not a stored status
    public enum State {
        PENDING,
        PAID,
        EXPIRED
    }
}
