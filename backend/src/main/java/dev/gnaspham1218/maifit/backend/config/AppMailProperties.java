package dev.gnaspham1218.maifit.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

// Bound from application.yaml -> app.mail.* (SMTP server settings live under spring.mail.*)
@ConfigurationProperties(prefix = "app.mail")
public record AppMailProperties(
        String from,      // must be the Gmail account itself (Gmail rewrites any other sender)
        String fromName,  // shown as the sender name in the inbox
        int dailyLimit    // max emails sent by the whole app per day (Vietnam time), see EmailDailyQuota
) {
}
