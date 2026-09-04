package tz.go.bukobamc.meetings.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tz.go.bukobamc.meetings.model.Invitation;
import tz.go.bukobamc.meetings.repo.InvitationRepository;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/webhooks/whatsapp")
public class WhatsAppWebhookController {

    private final String verifyToken;
    private final String appSecret;
    private final InvitationRepository invitationRepo;

    public WhatsAppWebhookController(
            @Value("${bmc.whatsapp-webhook-verify-token:}") String verifyToken,
            @Value("${bmc.whatsapp-app-secret:}") String appSecret,
            InvitationRepository invitationRepo) {
        this.verifyToken = verifyToken;
        this.appSecret = appSecret;
        this.invitationRepo = invitationRepo;
    }

    @GetMapping
    public ResponseEntity<String> verifyWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) {
        
        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            return ResponseEntity.ok(challenge);
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid verification token");
    }

    @PostMapping
    public ResponseEntity<String> handleWebhook(
            @RequestHeader("X-Hub-Signature-256") String signature,
            @RequestBody String payload) {
        
        if (appSecret == null || appSecret.isBlank()) {
            System.err.println("WhatsApp Webhook: APP_SECRET not configured, bypassing validation (Not recommended)");
        } else {
            if (!isValidSignature(payload, signature)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid signature");
            }
        }

        try {
            // Process the payload
            // Meta sends JSON, but since we just need simple fields, we could use Jackson or just parse it.
            // For simplicity and to avoid creating many DTOs, we'll parse it as a Map using Spring's ObjectMapper (which is available, but we can do it via a quick Jackson readTree).
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, Object> body = mapper.readValue(payload, Map.class);
            
            if ("whatsapp_business_account".equals(body.get("object"))) {
                List<Map<String, Object>> entries = (List<Map<String, Object>>) body.get("entry");
                if (entries != null) {
                    for (Map<String, Object> entry : entries) {
                        List<Map<String, Object>> changes = (List<Map<String, Object>>) entry.get("changes");
                        if (changes != null) {
                            for (Map<String, Object> change : changes) {
                                Map<String, Object> value = (Map<String, Object>) change.get("value");
                                if (value != null && value.containsKey("statuses")) {
                                    List<Map<String, Object>> statuses = (List<Map<String, Object>>) value.get("statuses");
                                    for (Map<String, Object> status : statuses) {
                                        processStatusUpdate(status);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return ResponseEntity.ok("EVENT_RECEIVED");
        } catch (Exception e) {
            System.err.println("Webhook processing error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private void processStatusUpdate(Map<String, Object> status) {
        String wamid = (String) status.get("id");
        String statusType = (String) status.get("status");
        
        if (wamid == null || statusType == null) return;

        Optional<Invitation> invOpt = invitationRepo.findByWhatsappMessageId(wamid);
        if (invOpt.isPresent()) {
            Invitation inv = invOpt.get();
            inv.whatsappStatus = statusType.toUpperCase();
            
            if ("delivered".equals(statusType)) {
                inv.whatsappDeliveredAt = OffsetDateTime.now();
            } else if ("read".equals(statusType)) {
                inv.whatsappReadAt = OffsetDateTime.now();
            } else if ("failed".equals(statusType)) {
                List<Map<String, Object>> errors = (List<Map<String, Object>>) status.get("errors");
                if (errors != null && !errors.isEmpty()) {
                    Map<String, Object> error = errors.get(0);
                    inv.whatsappError = String.valueOf(error.get("code")) + ": " + String.valueOf(error.get("title"));
                }
            }
            
            invitationRepo.save(inv);
        }
    }

    private boolean isValidSignature(String payload, String signatureHeader) {
        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) {
            return false;
        }
        String expectedSignature = signatureHeader.substring(7);
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return expectedSignature.equals(hexString.toString());
        } catch (Exception e) {
            return false;
        }
    }
}
