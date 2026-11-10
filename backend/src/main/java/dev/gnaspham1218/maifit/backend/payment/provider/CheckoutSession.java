package dev.gnaspham1218.maifit.backend.payment.provider;

// What the gateway gives back: enough to show a bank-transfer QR on our own page
public record CheckoutSession(
        String providerRef,    // the gateway's id for this payment
        String qrCode,         // VietQR payload (text, not an image)
        String bankBin,
        String accountNumber,
        String accountName,
        String description     // the transfer content to use, as returned by the gateway
) {
}
