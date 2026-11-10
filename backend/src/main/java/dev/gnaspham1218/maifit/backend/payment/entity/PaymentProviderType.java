package dev.gnaspham1218.maifit.backend.payment.entity;

// Payment gateways. Adding one = a new constant here, a new PaymentProvider implementation,
// and the new value in the CHECK constraint of payment_orders.provider (new migration).
public enum PaymentProviderType {
    PAYOS
}
