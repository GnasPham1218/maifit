package dev.gnaspham1218.maifit.backend.common.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

// DEV ONLY: prints the link to the log instead of sending an email.
// Must be replaced by the SMTP implementation (step 8) before merging: links in logs are a security risk.
@Component
public class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public void sendVerificationEmail(String to, String displayName, String link) {
        log.info("[DEV EMAIL] Verify email for {} -> {}", to, link);
    }

    @Override
    public void sendPasswordResetEmail(String to, String displayName, String link) {
        log.info("[DEV EMAIL] Reset password for {} -> {}", to, link);
    }
}
