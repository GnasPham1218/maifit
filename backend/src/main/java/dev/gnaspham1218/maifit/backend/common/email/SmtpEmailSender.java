package dev.gnaspham1218.maifit.backend.common.email;

import dev.gnaspham1218.maifit.backend.config.AppMailProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.io.UnsupportedEncodingException;

// Sends real emails through the SMTP server configured under spring.mail.* (Gmail)
@Component
@RequiredArgsConstructor
public class SmtpEmailSender implements EmailSender {

    private final JavaMailSender mailSender;
    private final AppMailProperties mailProperties;

    @Override
    public void sendVerificationEmail(String to, String displayName, String link) {
        String text = """
                Xin chào %s,

                Cảm ơn bạn đã đăng ký MAIFit. Bấm vào liên kết dưới đây để xác thực email:

                %s

                Liên kết có hiệu lực trong 24 giờ. Nếu bạn không đăng ký MAIFit, hãy bỏ qua email này.
                """.formatted(displayName, link);
        send(to, "Xác thực email MAIFit", text);
    }

    @Override
    public void sendPasswordResetEmail(String to, String displayName, String link) {
        String text = """
                Xin chào %s,

                Bạn vừa yêu cầu đặt lại mật khẩu MAIFit. Bấm vào liên kết dưới đây để đặt mật khẩu mới:

                %s

                Liên kết có hiệu lực trong 30 phút và chỉ dùng được một lần.
                Nếu bạn không yêu cầu, hãy bỏ qua email này: mật khẩu của bạn sẽ không thay đổi.
                """.formatted(displayName, link);
        send(to, "Đặt lại mật khẩu MAIFit", text);
    }

    private void send(String to, String subject, String text) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8"); // UTF-8 for Vietnamese
            helper.setFrom(mailProperties.from(), mailProperties.fromName());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, false); // plain text
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new IllegalStateException("Could not build email", e);
        }
    }
}
