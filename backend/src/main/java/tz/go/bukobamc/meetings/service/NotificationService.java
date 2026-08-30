package tz.go.bukobamc.meetings.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import tz.go.bukobamc.meetings.model.Guest;
import tz.go.bukobamc.meetings.model.Meeting;

import java.util.*;

@Service
public class NotificationService {

    private final JavaMailSender mail;
    private final EmailTemplateService templates;
    private final String from, whatsappUrl, whatsappToken, phoneNumberId;
    private final String templateName, templateLanguage;
    private final boolean whatsappEnabled, useTemplates;

    public NotificationService(
            JavaMailSender mail,
            EmailTemplateService templates,
            @Value("${bmc.default-email-sender}") String from,
            @Value("${WHATSAPP_API_URL:https://graph.facebook.com/v21.0}") String url,
            @Value("${WHATSAPP_ACCESS_TOKEN:}") String token,
            @Value("${WHATSAPP_PHONE_NUMBER_ID:}") String numberId,
            @Value("${bmc.whatsapp-enabled:false}") boolean enabled,
            @Value("${WHATSAPP_USE_TEMPLATES:true}") boolean useTemplates,
            @Value("${WHATSAPP_TEMPLATE_NAME:hello_world}") String templateName,
            @Value("${WHATSAPP_TEMPLATE_LANGUAGE:en_US}") String templateLanguage) {
        this.mail = mail;
        this.templates = templates;
        this.from = from;
        whatsappUrl = url;
        whatsappToken = token;
        phoneNumberId = numberId;
        whatsappEnabled = enabled;
        this.useTemplates = useTemplates;
        this.templateName = templateName;
        this.templateLanguage = templateLanguage;
    }

    public boolean isWhatsAppConfigured() {
        return whatsappEnabled && !whatsappToken.isBlank() && !phoneNumberId.isBlank();
    }

    public Map<String, Object> status() {
        return Map.of(
            "enabled", whatsappEnabled,
            "configured", isWhatsAppConfigured(),
            "use_templates", useTemplates,
            "template", templateName,
            "template_language", templateLanguage
        );
    }

    /** Send a formatted HTML email with a plain-text fallback. */
    public void emailHtml(String to, String subject, String htmlBody, String plainBody) {
        if (to == null || to.isBlank()) return;
        try {
            MimeMessage m = mail.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(m, true, "UTF-8");
            h.setFrom(from);
            h.setTo(to);
            h.setSubject(subject);
            h.setText(plainBody == null ? stripHtml(htmlBody) : plainBody, htmlBody);
            mail.send(m);
        } catch (Exception e) {
            System.err.println("Email delivery failed: " + e.getMessage());
            throw new IllegalStateException("Email delivery failed. Check SMTP_USERNAME, SMTP_PASSWORD, and Gmail App Password settings.", e);
        }
    }

    public void verificationEmail(String to, String recipientName, String code, String subject,
                                  String headline, String instructions) {
        String html = templates.verificationCode(recipientName, code, headline, instructions);
        String plain = templates.verificationCodePlain(code, headline);
        emailHtml(to, subject, html, plain);
    }

    public void meetingInvitationEmail(Guest guest, Meeting meeting, String organizerName, String checkInLink) {
        if (guest.email == null || guest.email.isBlank()) return;
        String subject = "You're invited: " + meeting.title;
        String html = templates.meetingInvitation(guest, meeting, organizerName, checkInLink);
        String plain = templates.meetingInvitationPlain(guest, meeting, organizerName, checkInLink);
        emailHtml(guest.email, subject, html, plain);
    }

    public String meetingInvitationPlain(Guest guest, Meeting meeting, String organizerName, String checkInLink) {
        return templates.meetingInvitationPlain(guest, meeting, organizerName, checkInLink);
    }

    /** Backward-compatible OTP email for sign-in flows. */
    public void otpEmail(String to, String otp) {
        verificationEmail(
            to,
            null,
            otp,
            "BMC Meetings – Your verification code",
            "Your verification code",
            "Use the one-time code below to complete your request."
        );
    }

    /**
     * Send WhatsApp message. In test/sandbox mode uses approved templates (default: hello_world).
     * Plain text only works inside the 24-hour customer service window.
     */
    public Map<String, Object> whatsapp(String to, String body) {
        if (!whatsappEnabled) {
            System.err.println("WhatsApp is disabled — set WHATSAPP_ENABLED=true in .env");
            return Map.of("sent", false, "reason", "disabled");
        }
        if (to == null || to.isBlank()) return Map.of("sent", false, "reason", "empty_number");
        if (whatsappToken.isBlank() || phoneNumberId.isBlank()) {
            System.err.println("WhatsApp not configured; set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID");
            return Map.of("sent", false, "reason", "not_configured");
        }
        String normalized = normalizePhone(to);
        try {
            if (useTemplates) {
                return sendTemplate(normalized, body);
            }
            return sendText(normalized, body);
        } catch (RestClientResponseException e) {
            String detail = e.getResponseBodyAsString();
            System.err.println("WhatsApp delivery failed: " + detail);
            return Map.of("sent", false, "reason", "api_error", "detail", detail, "to", normalized);
        } catch (Exception e) {
            System.err.println("WhatsApp delivery failed: " + e.getMessage());
            return Map.of("sent", false, "reason", e.getMessage(), "to", normalized);
        }
    }

    /** Convenience wrapper used by existing call sites. */
    public void whatsappQuiet(String to, String body) {
        whatsapp(to, body);
    }

    private Map<String, Object> sendText(String to, String body) {
        String endpoint = messagesEndpoint();
        Map<String, Object> payload = Map.of(
            "messaging_product", "whatsapp",
            "to", to,
            "type", "text",
            "text", Map.of("preview_url", true, "body", body));
        RestClient.create(endpoint).post()
            .header("Authorization", "Bearer " + whatsappToken)
            .header("Content-Type", "application/json")
            .body(payload).retrieve().toBodilessEntity();
        return Map.of("sent", true, "mode", "text", "to", to);
    }

    private Map<String, Object> sendTemplate(String to, String body) {
        String endpoint = messagesEndpoint();
        Map<String, Object> template = new LinkedHashMap<>();
        template.put("name", templateName);
        template.put("language", Map.of("code", templateLanguage));

        if (!"hello_world".equalsIgnoreCase(templateName) && body != null && !body.isBlank()) {
            template.put("components", List.of(Map.of(
                "type", "body",
                "parameters", List.of(Map.of("type", "text", "text", truncate(body, 1024)))
            )));
        }

        Map<String, Object> payload = Map.of(
            "messaging_product", "whatsapp",
            "to", to,
            "type", "template",
            "template", template);

        var response = RestClient.create(endpoint).post()
            .header("Authorization", "Bearer " + whatsappToken)
            .header("Content-Type", "application/json")
            .body(payload).retrieve().body(Map.class);

        return Map.of("sent", true, "mode", "template", "template", templateName, "to", to, "response", response == null ? Map.of() : response);
    }

    private String messagesEndpoint() {
        return whatsappUrl.endsWith("/")
            ? whatsappUrl + phoneNumberId + "/messages"
            : whatsappUrl + "/" + phoneNumberId + "/messages";
    }

    /** Tanzania-friendly: 0757219157 → 255757219157 */
    public static String normalizePhone(String raw) {
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.startsWith("0") && digits.length() == 10) {
            return "255" + digits.substring(1);
        }
        if (digits.startsWith("255")) return digits;
        if (digits.length() == 9) return "255" + digits;
        return digits;
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max - 3) + "...";
    }

    private static String stripHtml(String html) {
        return html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }
}
