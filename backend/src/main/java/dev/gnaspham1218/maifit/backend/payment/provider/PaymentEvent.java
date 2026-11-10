package dev.gnaspham1218.maifit.backend.payment.provider;

// A gateway's statement about one order, already authenticated by the provider
public record PaymentEvent(
        long orderCode,
        long amount,    // VND actually received
        boolean paid
) {
}
