package tz.go.bukobamc.meetings.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.*;

@Service
public class NotificationService {

    private final JavaMailSender mail;
    private final String from, whatsappUrl, whatsappToken, phoneNumberId;
    private final boolean whatsappEnabled;

    public NotificationService(
            JavaMailSender mail,
            @Value("${bmc.default-email-sender}") String from,
            @Value("${WHATSAPP_API_URL:https://graph.facebook.com/v20.0}") String url,
            @Value("${WHATSAPP_ACCESS_TOKEN:}") String token,
            @Value("${WHATSAPP_PHONE_NUMBER_ID:}") String numberId,
            @Value("${bmc.whatsapp-enabled:false}") boolean enabled) {
        this.mail = mail;
        this.from = from;
        whatsappUrl = url;
        whatsappToken = token;
        phoneNumberId = numberId;
        whatsappEnabled = enabled;
    }

    /** Send a plain-text email (generic use). */
    public void email(String to, String subject, String body) {
        if (to == null || to.isBlank()) return;
        try {
            MimeMessage m = mail.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(m, false, "UTF-8");
            h.setFrom(from);
            h.setTo(to);
            h.setSubject(subject);
            h.setText(body, false);
            mail.send(m);
        } catch (Exception e) {
            System.err.println("Email delivery failed: " + e.getMessage());
            if (!"development".equalsIgnoreCase(System.getenv().getOrDefault("APP_ENV", "development")))
                throw new IllegalStateException("Email delivery failed. Check SMTP_USERNAME, SMTP_PASSWORD, and Gmail App Password settings.", e);
        }
    }

    /** Send a styled HTML OTP email with the code displayed large and centered. */
    public void otpEmail(String to, String otp) {
        if (to == null || to.isBlank()) return;
        String html = buildOtpHtml(otp);
        try {
            MimeMessage m = mail.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(m, false, "UTF-8");
            h.setFrom(from);
            h.setTo(to);
            h.setSubject("BMC Meetings – Your Sign-In Code");
            h.setText(html, true);   // true = HTML
            mail.send(m);
        } catch (Exception e) {
            System.err.println("OTP email delivery failed: " + e.getMessage());
            if (!"development".equalsIgnoreCase(System.getenv().getOrDefault("APP_ENV", "development")))
                throw new IllegalStateException("Email delivery failed. Check SMTP_USERNAME, SMTP_PASSWORD, and Gmail App Password settings.", e);
        }
    }

    private String buildOtpHtml(String otp) {
        return """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>BMC Meetings – Sign-In Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0"
               style="max-width:520px;width:100%%;background:#ffffff;border-radius:16px;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a3c5e 0%%,#2563eb 100%%);
                        padding:36px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:2px;
                         color:#93c5fd;text-transform:uppercase;">Bukoba Municipal Council</p>
              <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;color:#ffffff;">
                BMC Meeting System
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:16px;color:#374151;">Hello,</p>
              <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
                Use the one-time code below to complete your sign-in.
                This code is valid for <strong>10 minutes</strong>.
              </p>

              <!-- OTP block -->
              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center"
                      style="background:#f0f5ff;border:2px dashed #2563eb;
                             border-radius:12px;padding:28px 20px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;
                               letter-spacing:2px;color:#2563eb;text-transform:uppercase;">
                      Your Sign-In Code
                    </p>
                    <p style="margin:0;font-size:52px;font-weight:800;
                               letter-spacing:12px;color:#1a3c5e;
                               font-family:'Courier New',Courier,monospace;">
                      %s
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you did not request this code, please ignore this email or contact
                your system administrator immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;
                        padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; 2025 Bukoba Municipal Council &nbsp;|&nbsp; BMC Meeting System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""".formatted(otp);
    }

    public void whatsapp(String to, String body) {
        if (!whatsappEnabled) { System.err.println("WhatsApp is disabled until Meta setup is complete"); return; }
        if (to == null || to.isBlank()) return;
        if (whatsappUrl.isBlank() || whatsappToken.isBlank() || phoneNumberId.isBlank()) {
            System.err.println("WhatsApp not configured; message for " + to + " was not sent");
            return;
        }
        try {
            String endpoint = whatsappUrl.endsWith("/")
                    ? whatsappUrl + phoneNumberId + "/messages"
                    : whatsappUrl + "/" + phoneNumberId + "/messages";
            Map<String, Object> payload = Map.of(
                    "messaging_product", "whatsapp",
                    "to", to,
                    "type", "text",
                    "text", Map.of("preview_url", true, "body", body));
            RestClient.create(endpoint).post()
                    .header("Authorization", "Bearer " + whatsappToken)
                    .header("Content-Type", "application/json")
                    .body(payload).retrieve().toBodilessEntity();
        } catch (Exception e) {
            System.err.println("WhatsApp delivery failed: " + e.getMessage());
        }
    }
}
