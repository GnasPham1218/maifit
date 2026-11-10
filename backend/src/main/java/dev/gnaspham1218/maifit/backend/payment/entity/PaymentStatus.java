package dev.gnaspham1218.maifit.backend.payment.entity;

// Stored states only. "Expired" is not stored: it is a PENDING order whose expires_at has passed.
public enum PaymentStatus {
    PENDING,
    PAID
}
