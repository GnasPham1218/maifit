package dev.gnaspham1218.maifit.backend.payment.service;

import dev.gnaspham1218.maifit.backend.payment.entity.PaymentOrder;
import dev.gnaspham1218.maifit.backend.payment.entity.PaymentProviderType;
import dev.gnaspham1218.maifit.backend.payment.entity.PaymentStatus;
import dev.gnaspham1218.maifit.backend.payment.provider.PaymentEvent;
import dev.gnaspham1218.maifit.backend.payment.repository.PaymentOrderRepository;
import dev.gnaspham1218.maifit.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

// The ONLY place that turns a payment into Premium time. Both the webhook and the manual
// "I have paid" refresh end up here with an event already authenticated by the provider.
// A separate bean (not a method of PaymentService) so @Transactional really applies:
// Spring's proxy is skipped when a bean calls its own method.
@Service
@RequiredArgsConstructor
public class PaymentConfirmationService {

    private static final Logger log = LoggerFactory.getLogger(PaymentConfirmationService.class);

    private final PaymentOrderRepository orderRepository;
    private final UserRepository userRepository;

    /** Returns true only for the one call that actually granted Premium for this order. */
    @Transactional
    public boolean confirm(PaymentProviderType provider, PaymentEvent event) {
        if (!event.paid()) {
            return false;
        }
        Optional<PaymentOrder> found = orderRepository.findByProviderAndOrderCode(provider, event.orderCode());
        if (found.isEmpty()) {
            // Normal for the sample payment the gateway sends when the webhook URL is registered
            log.info("{} reported a payment for unknown order {}, ignored", provider, event.orderCode());
            return false;
        }
        PaymentOrder order = found.get();
        // Never trust the amount on its own: it must cover what OUR order says
        if (event.amount() < order.getAmount()) {
            log.error("{} order {}: received {} VND but the order is {} VND, Premium NOT granted",
                    provider, order.getOrderCode(), event.amount(), order.getAmount());
            return false;
        }
        int updated = orderRepository.markPaid(order.getId(), Instant.now(), PaymentStatus.PENDING, PaymentStatus.PAID);
        if (updated == 0) {
            return false; // already confirmed by an earlier delivery: nothing to do (idempotent)
        }
        userRepository.extendPremium(order.getUserId(), Instant.now(), order.getPremiumDays());
        log.info("{} order {} paid: user {} gets {} more Premium days",
                provider, order.getOrderCode(), order.getUserId(), order.getPremiumDays());
        return true;
    }
}
