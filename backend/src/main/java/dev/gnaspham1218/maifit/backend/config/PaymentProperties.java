package dev.gnaspham1218.maifit.backend.config;

import dev.gnaspham1218.maifit.backend.payment.entity.PaymentProviderType;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

// Bound from application.yaml -> app.payment.*
@ConfigurationProperties(prefix = "app.payment")
public record PaymentProperties(
        PaymentProviderType provider,   // gateway used for NEW orders; webhooks of every gateway stay accepted
        Premium premium,
        Duration orderTtl,              // how long a QR stays payable
        int maxOrdersPerDay,            // new orders per user per day (Vietnam time): stops order spam at the gateway
        String description,             // bank-transfer content
        String returnUrl                // page a hosted checkout would return to
) {

    public record Premium(
            int price,   // VND for one purchase
            int days     // days of Premium one purchase adds
    ) {
    }
}
