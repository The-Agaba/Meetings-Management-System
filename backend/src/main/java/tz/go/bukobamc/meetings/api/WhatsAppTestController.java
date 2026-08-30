package tz.go.bukobamc.meetings.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tz.go.bukobamc.meetings.service.NotificationService;

import java.util.Map;

/**
 * Dev/test helpers for Meta WhatsApp Cloud API sandbox.
 * Only available when APP_ENV=development.
 */
@RestController
@RequestMapping("/api/dev/whatsapp")
public class WhatsAppTestController {

    public record PingRequest(String phone, String message) {}

    private final NotificationService notifications;
    private final String appEnv;

    public WhatsAppTestController(NotificationService notifications,
                                  @Value("${APP_ENV:development}") String appEnv) {
        this.notifications = notifications;
        this.appEnv = appEnv;
    }

    @GetMapping("/status")
    public Object status() {
        guardDev();
        return notifications.status();
    }

    /** Send a sandbox template message to a test recipient number. */
    @PostMapping("/ping")
    public Object ping(@RequestBody PingRequest body) {
        guardDev();
        if (body.phone() == null || body.phone().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "phone is required");
        }
        String message = body.message() == null || body.message().isBlank()
            ? "BMC Meetings test message — your WhatsApp number is reachable."
            : body.message();
        Map<String, Object> result = notifications.whatsapp(body.phone(), message);
        result = new java.util.LinkedHashMap<>(result);
        result.put("normalized_to", NotificationService.normalizePhone(body.phone()));
        result.put("hint", "Recipient must be added as a test number in Meta → WhatsApp → API Setup.");
        return result;
    }

    private void guardDev() {
        if (!"development".equalsIgnoreCase(appEnv)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
        }
    }
}
