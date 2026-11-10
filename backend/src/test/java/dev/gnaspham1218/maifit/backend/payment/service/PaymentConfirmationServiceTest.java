package dev.gnaspham1218.maifit.backend.payment.service;

import dev.gnaspham1218.maifit.backend.payment.entity.PaymentOrder;
import dev.gnaspham1218.maifit.backend.payment.entity.PaymentProviderType;
import dev.gnaspham1218.maifit.backend.payment.entity.PaymentStatus;
import dev.gnaspham1218.maifit.backend.payment.provider.CheckoutSession;
import dev.gnaspham1218.maifit.backend.payment.provider.PaymentEvent;
import dev.gnaspham1218.maifit.backend.payment.repository.PaymentOrderRepository;
import dev.gnaspham1218.maifit.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// The rules that decide whether a payment notice becomes Premium time (no database, no gateway)
class PaymentConfirmationServiceTest {

    private static final long USER_ID = 7L;
    private static final long ORDER_CODE = 1_794_000_000_000_123L;
    private static final int PRICE = 39_000;
    private static final int DAYS = 30;

    private PaymentOrderRepository orders;
    private UserRepository users;
    private PaymentConfirmationService service;

    @BeforeEach
    void setUp() {
        orders = mock(PaymentOrderRepository.class);
        users = mock(UserRepository.class);
        service = new PaymentConfirmationService(orders, users);
    }

    private void orderExists() {
        PaymentOrder order = new PaymentOrder(USER_ID, PaymentProviderType.PAYOS, ORDER_CODE, PRICE, DAYS,
                Instant.now().plusSeconds(900),
                new CheckoutSession("link-1", "qr", "970422", "0123456789", "MAIFIT", "MAIFit"));
        when(orders.findByProviderAndOrderCode(PaymentProviderType.PAYOS, ORDER_CODE)).thenReturn(Optional.of(order));
    }

    private void markPaidReturns(int rows) {
        when(orders.markPaid(any(), any(Instant.class), eq(PaymentStatus.PENDING), eq(PaymentStatus.PAID)))
                .thenReturn(rows);
    }

    @Test
    void paidOrderGrantsPremiumOnce() {
        orderExists();
        markPaidReturns(1);

        boolean granted = service.confirm(PaymentProviderType.PAYOS, new PaymentEvent(ORDER_CODE, PRICE, true));

        assertThat(granted).isTrue();
        verify(users).extendPremium(eq(USER_ID), any(Instant.class), eq(DAYS));
    }

    @Test
    void secondDeliveryOfTheSameWebhookGrantsNothing() {
        orderExists();
        markPaidReturns(0); // the guarded UPDATE finds the order already PAID

        boolean granted = service.confirm(PaymentProviderType.PAYOS, new PaymentEvent(ORDER_CODE, PRICE, true));

        assertThat(granted).isFalse();
        verify(users, never()).extendPremium(anyLong(), any(Instant.class), anyInt());
    }

    @Test
    void underpaidOrderIsNotMarkedPaid() {
        orderExists();

        boolean granted = service.confirm(PaymentProviderType.PAYOS, new PaymentEvent(ORDER_CODE, PRICE - 1, true));

        assertThat(granted).isFalse();
        verify(orders, never()).markPaid(any(), any(Instant.class), any(), any());
        verify(users, never()).extendPremium(anyLong(), any(Instant.class), anyInt());
    }

    @Test
    void unknownOrderIsIgnored() {
        // e.g. the sample payment payOS sends when the webhook URL is registered
        when(orders.findByProviderAndOrderCode(PaymentProviderType.PAYOS, 123L)).thenReturn(Optional.empty());

        boolean granted = service.confirm(PaymentProviderType.PAYOS, new PaymentEvent(123L, 3_000, true));

        assertThat(granted).isFalse();
        verify(users, never()).extendPremium(anyLong(), any(Instant.class), anyInt());
    }

    @Test
    void unpaidEventDoesNotEvenLookUpTheOrder() {
        boolean granted = service.confirm(PaymentProviderType.PAYOS, new PaymentEvent(ORDER_CODE, 0, false));

        assertThat(granted).isFalse();
        verify(orders, never()).findByProviderAndOrderCode(any(), any());
    }
}
