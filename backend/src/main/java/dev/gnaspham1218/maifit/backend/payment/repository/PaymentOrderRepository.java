package dev.gnaspham1218.maifit.backend.payment.repository;

import dev.gnaspham1218.maifit.backend.payment.entity.PaymentOrder;
import dev.gnaspham1218.maifit.backend.payment.entity.PaymentProviderType;
import dev.gnaspham1218.maifit.backend.payment.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, Long> {

    // Ownership check built into the query: another user's order simply is "not found" (IDOR)
    Optional<PaymentOrder> findByOrderCodeAndUserId(Long orderCode, Long userId);

    // Webhooks carry no user: the order is found by the gateway + its order code
    Optional<PaymentOrder> findByProviderAndOrderCode(PaymentProviderType provider, Long orderCode);

    // Newest order of this user that can still be paid
    Optional<PaymentOrder> findFirstByUserIdAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
            Long userId, PaymentStatus status, Instant now);

    long countByUserIdAndCreatedAtGreaterThanEqual(Long userId, Instant from);

    // PENDING -> PAID in ONE statement. The "status = PENDING" guard makes it idempotent and safe
    // under concurrency: of many webhook deliveries (or a webhook racing a manual refresh) for the
    // same order, exactly one gets 1 row back; the others get 0 and must not grant anything.
    @Modifying
    @Query("""
            update PaymentOrder o set o.status = :paid, o.paidAt = :now
            where o.id = :id and o.status = :pending
            """)
    int markPaid(@Param("id") Long id,
                 @Param("now") Instant now,
                 @Param("pending") PaymentStatus pending,
                 @Param("paid") PaymentStatus paid);
}
