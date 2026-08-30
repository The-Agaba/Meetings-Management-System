package tz.go.bukobamc.meetings.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tz.go.bukobamc.meetings.security.SessionService;
import tz.go.bukobamc.meetings.model.User;
import tz.go.bukobamc.meetings.service.NotificationService;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/integrations")
public class IntegrationsController {

    public record WhatsAppTestRequest(String phone, String message) {}

    private final SessionService sessions;
    private final NotificationService notifications;
    private final String appEnv;

    public IntegrationsController(SessionService sessions,
                                  NotificationService notifications,
                                  @Value("${APP_ENV:development}") String appEnv) {
        this.sessions = sessions;
        this.notifications = notifications;
        this.appEnv = appEnv;
    }

    @GetMapping
    public Object status(@RequestHeader("Authorization") String auth) {
        requireAdmin(auth);
        Map<String, Object> result = new LinkedHashMap<>(notifications.status());
        result.put("environment", appEnv);
        result.put("whatsapp_registration_otp", notifications.status().get("enabled"));
        return result;
    }

    @PostMapping("/whatsapp-test")
    public Object testWhatsApp(@RequestHeader("Authorization") String auth,
                               @RequestBody WhatsAppTestRequest body) {
        requireAdmin(auth);
        if (body.phone() == null || body.phone().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "phone is required");
        }
        String message = body.message() == null || body.message().isBlank()
            ? "BMC Meetings test — your WhatsApp number is reachable."
            : body.message();
        Map<String, Object> result = new LinkedHashMap<>(notifications.whatsapp(body.phone(), message));
        result.put("normalized_to", NotificationService.normalizePhone(body.phone()));
        result.put("hint", "Recipient must be a Meta sandbox test number when using the free developer setup.");
        return result;
    }

    private User requireAdmin(String auth) {
        User user = sessions.require(auth);
        if (!"admin".equals(user.role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
        return user;
    }
}
