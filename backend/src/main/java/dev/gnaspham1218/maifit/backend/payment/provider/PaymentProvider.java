package dev.gnaspham1218.maifit.backend.payment.provider;

import dev.gnaspham1218.maifit.backend.payment.entity.PaymentProviderType;
import org.springframework.http.HttpHeaders;

/**
 * One payment gateway (payOS today, SePay later). PaymentService only talks to this interface,
 * so adding a gateway is one new class and no change in the service or the controllers.
 *
 * Implementations translate between the gateway's API and our own small types; they never touch
 * the database and never decide whether an order is paid (PaymentConfirmationService does).
 */
public interface PaymentProvider {

    PaymentProviderType type();

    /**
     * Ask the gateway for a way to pay this order.
     * Throws AppException(PAYMENT_UNAVAILABLE) when the gateway cannot be reached or refuses.
     */
    CheckoutSession createPayment(NewPayment payment);

    /**
     * Authenticate and read a webhook call. Gets the raw body and all headers because every gateway
     * proves authenticity differently (payOS: HMAC signature inside the body; SePay: API key header).
     * Throws AppException(PAYMENT_WEBHOOK_INVALID) when the call is not provably from the gateway.
     */
    PaymentEvent parseWebhook(String rawBody, HttpHeaders headers);

    /**
     * Ask the gateway for the current state of an order: the fallback when a webhook was lost
     * (and the only way to confirm a payment on localhost, where webhooks cannot arrive).
     */
    PaymentEvent fetchPayment(long orderCode);
}
