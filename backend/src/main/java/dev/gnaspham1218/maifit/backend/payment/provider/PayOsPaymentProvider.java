package dev.gnaspham1218.maifit.backend.payment.provider;

import dev.gnaspham1218.maifit.backend.common.exception.AppException;
import dev.gnaspham1218.maifit.backend.common.exception.ErrorCode;
import dev.gnaspham1218.maifit.backend.config.PayOsProperties;
import dev.gnaspham1218.maifit.backend.payment.entity.PaymentProviderType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import vn.payos.PayOS;
import vn.payos.core.ClientOptions;
import vn.payos.exception.PayOSException;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;
import vn.payos.model.webhooks.WebhookData;

// The only class that knows payOS (official SDK vn.payos:payos-java).
@Component
public class PayOsPaymentProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(PayOsPaymentProvider.class);
    private static final String SUCCESS_CODE = "00"; // payOS: "00" = success

    private final PayOS client;

    public PayOsPaymentProvider(PayOsProperties props) {
        // Fail fast: without the keys no payment could ever be confirmed
        if (isBlank(props.clientId()) || isBlank(props.apiKey()) || isBlank(props.checksumKey())) {
            throw new IllegalStateException("payOS keys are missing: set PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY");
        }
        this.client = new PayOS(ClientOptions.builder()
                .clientId(props.clientId())
                .apiKey(props.apiKey())
                .checksumKey(props.checksumKey())
                .timeoutMs((int) props.timeout().toMillis())
                // No automatic retry: a retried "create" would reuse the order code and be refused as a duplicate
                .maxRetries(0)
                .build());
    }

    @Override
    public PaymentProviderType type() {
        return PaymentProviderType.PAYOS;
    }

    @Override
    public CheckoutSession createPayment(NewPayment payment) {
        CreatePaymentLinkRequest request = CreatePaymentLinkRequest.builder()
                .orderCode(payment.orderCode())
                .amount((long) payment.amount())
                .description(payment.description())
                .returnUrl(payment.returnUrl())
                .cancelUrl(payment.cancelUrl())
                .expiredAt(payment.expiresAt().getEpochSecond()) // Unix seconds
                .build();
        try {
            // The SDK signs the request and checks the signature of the response with the checksum key
            CreatePaymentLinkResponse response = client.paymentRequests().create(request);
            return new CheckoutSession(
                    response.getPaymentLinkId(),
                    response.getQrCode(),
                    response.getBin(),
                    response.getAccountNumber(),
                    response.getAccountName(),
                    response.getDescription());
        } catch (PayOSException e) {
            log.error("payOS refused to create a payment link for order {}: {}", payment.orderCode(), e.getMessage());
            throw new AppException(ErrorCode.PAYMENT_UNAVAILABLE);
        }
    }

    @Override
    public PaymentEvent parseWebhook(String rawBody, HttpHeaders headers) {
        WebhookData data;
        try {
            // Recomputes the HMAC-SHA256 signature of "data" with the checksum key and compares it
            // with the "signature" field. Anyone can POST to a public URL; only payOS can sign.
            data = client.webhooks().verify(rawBody);
        } catch (PayOSException e) {
            log.warn("Rejected payOS webhook: {}", e.getMessage());
            throw new AppException(ErrorCode.PAYMENT_WEBHOOK_INVALID);
        } catch (RuntimeException e) {
            // Not even the expected JSON shape (e.g. no "signature" field)
            log.warn("Rejected malformed payOS webhook: {}", e.toString());
            throw new AppException(ErrorCode.PAYMENT_WEBHOOK_INVALID);
        }
        if (data == null || data.getOrderCode() == null || data.getAmount() == null) {
            throw new AppException(ErrorCode.PAYMENT_WEBHOOK_INVALID);
        }
        return new PaymentEvent(data.getOrderCode(), data.getAmount(), SUCCESS_CODE.equals(data.getCode()));
    }

    @Override
    public PaymentEvent fetchPayment(long orderCode) {
        try {
            PaymentLink link = client.paymentRequests().get(Long.valueOf(orderCode));
            long amountPaid = link.getAmountPaid() == null ? 0L : link.getAmountPaid();
            return new PaymentEvent(orderCode, amountPaid, link.getStatus() == PaymentLinkStatus.PAID);
        } catch (PayOSException e) {
            log.error("payOS could not report the state of order {}: {}", orderCode, e.getMessage());
            throw new AppException(ErrorCode.PAYMENT_UNAVAILABLE);
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
