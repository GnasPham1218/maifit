package dev.gnaspham1218.maifit.backend.common.email;

// Services depend on this interface only. Step 8 adds the Gmail SMTP implementation.
public interface EmailSender {

    void sendVerificationEmail(String to, String displayName, String link);
}
