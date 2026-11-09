package dev.gnaspham1218.maifit.backend.common.email;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

// Services publish an event instead of sending mail directly.
// AFTER_COMMIT: the email goes out only if the DB transaction succeeded (no link to a token that was rolled back).
// @Async: it runs on a background thread, so the HTTP request does not wait for Gmail.
@Component
@RequiredArgsConstructor
public class EmailEventListener {

    private static final Logger log = LoggerFactory.getLogger(EmailEventListener.class);

    private final EmailSender emailSender;
    private final EmailDailyQuota dailyQuota;

    @Async
    @TransactionalEventListener
    public void on(VerificationEmailEvent event) {
        if (!dailyQuota.tryAcquire()) {
            // ERROR, not WARN: reaching the cap almost certainly means an attack. Never log the link (it contains a token)
            log.error("Daily email limit reached; verification email to {} not sent", event.to());
            return;
        }
        try {
            emailSender.sendVerificationEmail(event.to(), event.displayName(), event.link());
        } catch (Exception e) {
            // Never log the link: it contains a usable token
            log.error("Failed to send verification email to {}", event.to(), e);
        }
    }

    @Async
    @TransactionalEventListener
    public void on(PasswordResetEmailEvent event) {
        if (!dailyQuota.tryAcquire()) {
            log.error("Daily email limit reached; password reset email to {} not sent", event.to());
            return;
        }
        try {
            emailSender.sendPasswordResetEmail(event.to(), event.displayName(), event.link());
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}", event.to(), e);
        }
    }
}
