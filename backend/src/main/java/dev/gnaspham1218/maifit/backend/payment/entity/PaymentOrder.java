package dev.gnaspham1218.maifit.backend.payment.entity;

import dev.gnaspham1218.maifit.backend.payment.provider.CheckoutSession;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

// One payment attempt for Premium. Created as PENDING; the only change afterwards is PENDING -> PAID,
// done by PaymentOrderRepository.markPaid (one guarded UPDATE), never by a setter.
@Entity
@Table(name = "payment_orders")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private PaymentProviderType provider;

    @Column(nullable = false, updatable = false)
    private Long orderCode;

    @Column(nullable = false, updatable = false)
    private int amount; // VND

    @Column(nullable = false, updatable = false)
    private int premiumDays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PaymentStatus status;

    @Column(length = 64, updatable = false)
    private String providerRef;

    @Column(length = 1024, updatable = false)
    private String qrCode;

    @Column(length = 16, updatable = false)
    private String bankBin;

    @Column(length = 32, updatable = false)
    private String accountNumber;

    @Column(length = 128, updatable = false)
    private String accountName;

    @Column(length = 64, updatable = false)
    private String description;

    @Column(nullable = false, updatable = false)
    private Instant expiresAt;

    private Instant paidAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public PaymentOrder(Long userId, PaymentProviderType provider, long orderCode, int amount, int premiumDays,
                        Instant expiresAt, CheckoutSession session) {
        this.userId = userId;
        this.provider = provider;
        this.orderCode = orderCode;
        this.amount = amount;
        this.premiumDays = premiumDays;
        this.status = PaymentStatus.PENDING;
        this.providerRef = session.providerRef();
        this.qrCode = session.qrCode();
        this.bankBin = session.bankBin();
        this.accountNumber = session.accountNumber();
        this.accountName = session.accountName();
        this.description = session.description();
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    // Still waiting for money and still payable
    public boolean isPayable(Instant now) {
        return status == PaymentStatus.PENDING && expiresAt.isAfter(now);
    }
}
