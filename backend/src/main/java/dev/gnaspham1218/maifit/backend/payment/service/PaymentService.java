package dev.gnaspham1218.maifit.backend.payment.service;

import dev.gnaspham1218.maifit.backend.ai.service.AiUsageService;
import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.common.time.AppTime;
import dev.gnaspham1218.maifit.backend.config.PaymentProperties;
import dev.gnaspham1218.maifit.backend.payment.dto.PaymentOrderResponse;
import dev.gnaspham1218.maifit.backend.payment.dto.PremiumPlanResponse;
import dev.gnaspham1218.maifit.backend.payment.dto.PricingResponse;
import dev.gnaspham1218.maifit.backend.payment.entity.PaymentOrder;
import dev.gnaspham1218.maifit.backend.payment.entity.PaymentProviderType;
import dev.gnaspham1218.maifit.backend.payment.entity.PaymentStatus;
import dev.gnaspham1218.maifit.backend.payment.provider.CheckoutSession;
import dev.gnaspham1218.maifit.backend.payment.provider.NewPayment;
import dev.gnaspham1218.maifit.backend.payment.provider.PaymentEvent;
import dev.gnaspham1218.maifit.backend.payment.provider.PaymentProvider;
import dev.gnaspham1218.maifit.backend.payment.repository.PaymentOrderRepository;
import dev.gnaspham1218.maifit.backend.user.service.PremiumService;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

// Orders for Premium. Knows PaymentProvider only, never a concrete gateway.
// No @Transactional here on purpose: a database transaction must not stay open while we wait
// for the gateway over HTTP. Each repository call commits on its own; the one multi-step
// change (order PAID + Premium time) lives in PaymentConfirmationService.
@Service
public class PaymentService {

    // A pending order is reused only if the user still has this long to pay it
    private static final Duration MIN_TIME_LEFT = Duration.ofMinutes(2);

    private final Map<PaymentProviderType, PaymentProvider> providers = new EnumMap<>(PaymentProviderType.class);
    private final PaymentOrderRepository orderRepository;
    private final PaymentConfirmationService confirmationService;
    private final PremiumService premiumService;
    private final AiUsageService aiUsageService;
    private final PaymentProperties props;

    // Spring injects every PaymentProvider bean: a new gateway registers itself just by existing
    public PaymentService(List<PaymentProvider> providerBeans,
                          PaymentOrderRepository orderRepository,
                          PaymentConfirmationService confirmationService,
                          PremiumService premiumService,
                          AiUsageService aiUsageService,
                          PaymentProperties props) {
        for (PaymentProvider provider : providerBeans) {
            providers.put(provider.type(), provider);
        }
        if (!providers.containsKey(props.provider())) {
            throw new IllegalStateException("No PaymentProvider bean for app.payment.provider=" + props.provider());
        }
        this.orderRepository = orderRepository;
        this.confirmationService = confirmationService;
        this.premiumService = premiumService;
        this.aiUsageService = aiUsageService;
        this.props = props;
    }

    public PremiumPlanResponse plan(Long userId) {
        Instant now = Instant.now();
        Instant premiumUntil = premiumService.premiumUntil(userId);
        PaymentOrderResponse pending = findPayable(userId, now).map(order -> toResponse(order, now)).orElse(null);
        return new PremiumPlanResponse(
                premiumUntil != null && premiumUntil.isAfter(now),
                premiumUntil,
                props.premium().price(),
                props.premium().days(),
                aiUsageService.freeFoodVisionLimit(),
                aiUsageService.premiumFoodVisionLimit(),
                aiUsageService.freeChatLimit(),
                aiUsageService.premiumChatLimit(),
                pending);
    }

    /** Price and daily limits only, for visitors (public endpoint). */
    public PricingResponse pricing() {
        return new PricingResponse(props.premium().price(), props.premium().days(),
                aiUsageService.freeFoodVisionLimit(), aiUsageService.premiumFoodVisionLimit(),
                aiUsageService.freeChatLimit(), aiUsageService.premiumChatLimit());
    }

    /** Start (or continue) paying for Premium: returns an order with the bank-transfer QR. */
    public PaymentOrderResponse checkout(Long userId) {
        Instant now = Instant.now();
        PaymentProviderType type = props.provider();
        int price = props.premium().price();

        // Reload / second tab / double click: show the same QR instead of opening a new order
        Optional<PaymentOrder> reusable = findPayable(userId, now)
                .filter(order -> order.getProvider() == type && order.getAmount() == price)
                .filter(order -> order.getExpiresAt().isAfter(now.plus(MIN_TIME_LEFT)));
        if (reusable.isPresent()) {
            return toResponse(reusable.get(), now);
        }

        Instant startOfDay = ZonedDateTime.now(AppTime.ZONE).toLocalDate().atStartOfDay(AppTime.ZONE).toInstant();
        if (orderRepository.countByUserIdAndCreatedAtGreaterThanEqual(userId, startOfDay) >= props.maxOrdersPerDay()) {
            throw new AppException(ErrorCode.PAYMENT_ORDER_LIMIT);
        }

        long orderCode = newOrderCode();
        Instant expiresAt = now.plus(props.orderTtl());
        // The gateway is asked first: an order is only stored once there is something to pay with
        CheckoutSession session = providers.get(type).createPayment(new NewPayment(
                orderCode, price, props.description(), expiresAt, props.returnUrl(), props.returnUrl()));
        PaymentOrder order = orderRepository.save(new PaymentOrder(
                userId, type, orderCode, price, props.premium().days(), expiresAt, session));
        return toResponse(order, now);
    }

    public PaymentOrderResponse get(Long userId, long orderCode) {
        return toResponse(findOwned(userId, orderCode), Instant.now());
    }

    /**
     * "I have paid": ask the gateway directly instead of waiting for its webhook.
     * Goes through the same confirmation as the webhook, so it cannot grant Premium twice.
     */
    public PaymentOrderResponse refresh(Long userId, long orderCode) {
        PaymentOrder order = findOwned(userId, orderCode);
        if (order.getStatus() == PaymentStatus.PENDING) {
            PaymentEvent event = providers.get(order.getProvider()).fetchPayment(order.getOrderCode());
            confirmationService.confirm(order.getProvider(), event);
            order = findOwned(userId, orderCode); // read the state after the confirmation
        }
        return toResponse(order, Instant.now());
    }

    /** Called by the public webhook endpoint. The provider authenticates the call before anything else. */
    public void handleWebhook(PaymentProviderType type, String rawBody, HttpHeaders headers) {
        PaymentProvider provider = providers.get(type);
        if (provider == null) {
            throw new AppException(ErrorCode.NOT_FOUND);
        }
        PaymentEvent event = provider.parseWebhook(rawBody, headers);
        confirmationService.confirm(type, event);
    }

    private Optional<PaymentOrder> findPayable(Long userId, Instant now) {
        return orderRepository.findFirstByUserIdAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
                userId, PaymentStatus.PENDING, now);
    }

    private PaymentOrder findOwned(Long userId, long orderCode) {
        return orderRepository.findByOrderCodeAndUserId(orderCode, userId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_ORDER_NOT_FOUND));
    }

    // Milliseconds + 3 random digits: unique in practice (the UNIQUE constraint is the real guard),
    // not guessable from the id, and below 2^53 so JavaScript reads it exactly.
    private static long newOrderCode() {
        return System.currentTimeMillis() * 1000 + ThreadLocalRandom.current().nextInt(1000);
    }

    private static PaymentOrderResponse toResponse(PaymentOrder order, Instant now) {
        boolean payable = order.isPayable(now);
        PaymentOrderResponse.State state = order.getStatus() == PaymentStatus.PAID
                ? PaymentOrderResponse.State.PAID
                : payable ? PaymentOrderResponse.State.PENDING : PaymentOrderResponse.State.EXPIRED;
        return new PaymentOrderResponse(
                order.getOrderCode(),
                order.getAmount(),
                order.getPremiumDays(),
                state,
                order.getExpiresAt(),
                order.getPaidAt(),
                payable && order.getQrCode() != null ? QrCodeRenderer.toSvg(order.getQrCode()) : null,
                payable ? order.getBankBin() : null,
                payable ? order.getAccountNumber() : null,
                payable ? order.getAccountName() : null,
                payable ? order.getDescription() : null);
    }
}
