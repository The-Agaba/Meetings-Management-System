package tz.go.bukobamc.meetings.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tz.go.bukobamc.meetings.model.User;
import tz.go.bukobamc.meetings.repo.UserRepository;
import tz.go.bukobamc.meetings.security.PasswordService;
import tz.go.bukobamc.meetings.security.SessionService;
import tz.go.bukobamc.meetings.service.NotificationService;
import tz.go.bukobamc.meetings.service.OtpService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthOtpController {
    public record LoginStart(String email, String password) {}
    public record LoginVerify(String email, String email_code, String whatsapp_code) {}

    private final UserRepository users;
    private final SessionService sessions;
    private final PasswordService passwords;
    private final OtpService otpService;
    private final NotificationService notifications;
    private final boolean whatsappEnabled;
    private final String appEnv;

    public AuthOtpController(UserRepository users, SessionService sessions, PasswordService passwords,
                             OtpService otpService, NotificationService notifications,
                             @Value("${bmc.whatsapp-enabled:false}") boolean whatsappEnabled,
                             @Value("${APP_ENV:development}") String appEnv) {
        this.users = users;
        this.sessions = sessions;
        this.passwords = passwords;
        this.otpService = otpService;
        this.notifications = notifications;
        this.whatsappEnabled = whatsappEnabled;
        this.appEnv = appEnv;
    }

    @GetMapping("/config")
    public Object config() {
        return Map.of("whatsapp_enabled", whatsappEnabled);
    }

    @PostMapping("/login/start")
    public Object start(@RequestBody LoginStart body) {
        User user = users.findByEmail(body.email().trim().toLowerCase())
            .filter(u -> u.active && "active".equals(u.status))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Invalid email, password, or unverified account"));
        if (!passwords.matches(body.password(), user.passwordHash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Invalid email, password, or unverified account");
        }
        if (passwords.isLegacyHash(user.passwordHash)) {
            user.passwordHash = passwords.hash(body.password());
            users.save(user);
        }
        String emailCode = otpService.issueNumeric(user, "login_email");
        String phoneCode = (whatsappEnabled && user.phone != null && !user.phone.isBlank())
            ? otpService.issueNumeric(user, "login_phone") : "";
        if (whatsappEnabled && user.phone != null && !user.phone.isBlank()) {
            notifications.whatsappQuiet(user.phone,
                "Your BMC Meeting System sign-in OTP is " + phoneCode + ". It expires in 10 minutes.");
        }
        notifications.verificationEmail(
            user.email,
            user.name,
            emailCode,
            "BMC Meetings – Sign-in verification",
            "Your sign-in code",
            "Use the one-time code below to complete your sign-in to BMC Meetings."
        );
        Map<String, Object> result = new HashMap<>();
        result.put("status", "otp_required");
        result.put("whatsapp_enabled", whatsappEnabled);
        result.put("message", whatsappEnabled ? "OTP sent to email and WhatsApp" : "OTP sent to email");
        if ("development".equalsIgnoreCase(appEnv)) {
            System.out.println("====== DEV OTP (Login) ======");
            System.out.println("Email OTP: " + emailCode);
            if (whatsappEnabled && user.phone != null && !user.phone.isBlank()) {
                System.out.println("WhatsApp OTP: " + phoneCode);
            }
            System.out.println("=============================");
        }
        return result;
    }

    @PostMapping("/login/verify")
    public Object verify(@RequestBody LoginVerify body) {
        User user = users.findByEmail(body.email().trim().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid account"));
        otpService.verify(user, "login_email", body.email_code(), "Invalid or expired email OTP");
        if (whatsappEnabled) {
            otpService.verify(user, "login_phone", body.whatsapp_code(), "Invalid or expired WhatsApp OTP");
        }
        return Map.of(
            "access_token", sessions.create(user),
            "user", Map.of("name", user.name, "role", user.role, "email", user.email)
        );
    }
}
