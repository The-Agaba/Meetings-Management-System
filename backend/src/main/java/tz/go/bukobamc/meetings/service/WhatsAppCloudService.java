package tz.go.bukobamc.meetings.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WhatsAppCloudService {

    private final String whatsappUrl;
    private final String whatsappToken;
    private final boolean whatsappEnabled;

    public WhatsAppCloudService(
            @Value("${bmc.whatsapp-api-url:https://graph.facebook.com/v21.0}") String url,
            @Value("${bmc.whatsapp-access-token:}") String token,
            @Value("${bmc.whatsapp-enabled:false}") boolean enabled) {
        this.whatsappUrl = url;
        this.whatsappToken = token;
        this.whatsappEnabled = enabled;
    }

    public boolean isEnabled() {
        return whatsappEnabled;
    }

    public Map<String, Object> sendTemplate(String to, String phoneNumberId, String templateName, String languageCode, List<String> bodyParams, List<String> buttonUrlParams) {
        if (!whatsappEnabled) {
            return Map.of("sent", false, "reason", "disabled");
        }
        if (whatsappToken == null || whatsappToken.isBlank() || phoneNumberId == null || phoneNumberId.isBlank()) {
            return Map.of("sent", false, "reason", "not_configured");
        }
        
        String endpoint = messagesEndpoint(phoneNumberId);
        
        Map<String, Object> template = new LinkedHashMap<>();
        template.put("name", templateName);
        template.put("language", Map.of("code", languageCode));

        if (bodyParams != null && !bodyParams.isEmpty()) {
            List<Map<String, Object>> components = new java.util.ArrayList<>();
            List<Map<String, Object>> parameters = bodyParams.stream()
                .map(p -> (Map<String, Object>) Map.<String, Object>of("type", "text", "text", truncate(p, 1024)))
                .toList();
                
            components.add(Map.of(
                "type", "body",
                "parameters", parameters
            ));

            if (buttonUrlParams != null && !buttonUrlParams.isEmpty()) {
                List<Map<String, Object>> btnParams = buttonUrlParams.stream()
                    .map(p -> (Map<String, Object>) Map.<String, Object>of("type", "text", "text", truncate(p, 1024)))
                    .toList();
                components.add(Map.of(
                    "type", "button",
                    "sub_type", "url",
                    "index", "0",
                    "parameters", btnParams
                ));
            }
            template.put("components", components);
        }

        Map<String, Object> payload = Map.of(
            "messaging_product", "whatsapp",
            "to", normalizePhone(to),
            "type", "template",
            "template", template);

        try {
            var response = RestClient.create(endpoint).post()
                .header("Authorization", "Bearer " + whatsappToken)
                .header("Content-Type", "application/json")
                .body(payload)
                .retrieve()
                .body(Map.class);

            return Map.of("sent", true, "response", response == null ? Map.of() : response);
        } catch (RestClientResponseException e) {
            String detail = e.getResponseBodyAsString();
            System.err.println("WhatsApp delivery failed: " + detail);
            return Map.of("sent", false, "reason", "api_error", "detail", detail);
        } catch (Exception e) {
            System.err.println("WhatsApp delivery failed: " + e.getMessage());
            return Map.of("sent", false, "reason", e.getMessage());
        }
    }

    private String messagesEndpoint(String phoneNumberId) {
        return whatsappUrl.endsWith("/")
            ? whatsappUrl + phoneNumberId + "/messages"
            : whatsappUrl + "/" + phoneNumberId + "/messages";
    }

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
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max - 3) + "...";
    }
}
