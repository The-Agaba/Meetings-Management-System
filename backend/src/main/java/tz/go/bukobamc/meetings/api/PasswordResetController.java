package tz.go.bukobamc.meetings.api;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tz.go.bukobamc.meetings.model.User;
import tz.go.bukobamc.meetings.repo.StaffSessionRepository;
import tz.go.bukobamc.meetings.repo.UserRepository;
import tz.go.bukobamc.meetings.security.PasswordService;
import tz.go.bukobamc.meetings.security.SessionService;
import tz.go.bukobamc.meetings.service.AuditService;
import tz.go.bukobamc.meetings.service.NotificationService;
import tz.go.bukobamc.meetings.service.OtpService;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PasswordResetController {
    public record ResetRequest(String email) {}
    public record ResetConfirm(String email, String code, String password) {}
    public record PasswordChange(String current_password, String new_password) {}

    private final UserRepository users;
    private final StaffSessionRepository staffSessions;
    private final SessionService sessions;
    private final PasswordService passwords;
    private final OtpService otpService;
    private final NotificationService notifications;
    private final AuditService audit;
    private final String appEnv;

    public PasswordResetController(UserRepository users, StaffSessionRepository staffSessions,
                                   SessionService sessions, PasswordService passwords,
                                   OtpService otpService, NotificationService notifications,
                                   AuditService audit, @Value("${APP_ENV:development}") String appEnv) {
        this.users = users;
        this.staffSessions = staffSessions;
        this.sessions = sessions;
        this.passwords = passwords;
        this.otpService = otpService;
        this.notifications = notifications;
        this.audit = audit;
        this.appEnv = appEnv;
    }

    @PostMapping("/auth/logout")
    public Map<String, String> logout(@RequestHeader(value = "Authorization", required = false) String auth,
                                      HttpServletRequest request) {
        User user = null;
        try {
            user = sessions.require(auth);
        } catch (ResponseStatusException ignored) {
        }
        sessions.revoke(auth);
        if (user != null) audit.record(user, "LOGOUT", "Signed out", clientIp(request));
        return Map.of("status", "signed_out");
    }

    @PostMapping("/auth/password-reset/request")
    public Map<String, Object> requestReset(@RequestBody ResetRequest body, HttpServletRequest request) {
        String email = body.email().trim().toLowerCase();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "sent");
        response.put("message", "If that email is registered, a reset code has been sent.");
        users.findByEmail(email).ifPresent(user -> {
            String code = otpService.issueNumeric(user, "password_reset");
            notifications.email(user.email, "BMC Meetings password reset",
                "Your password reset code is " + code + ". It expires in 10 minutes.");
            audit.record(user, "PASSWORD_RESET_REQUEST", "Reset code sent", clientIp(request));
            if ("development".equalsIgnoreCase(appEnv)) response.put("development_email_otp", code);
        });
        return response;
    }

    @PostMapping("/auth/password-reset/confirm")
    public Map<String, String> confirmReset(@RequestBody ResetConfirm body, HttpServletRequest request) {
        User user = users.findByEmail(body.email().trim().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired reset code."));
        otpService.verify(user, "password_reset", body.code(), "Invalid or expired reset code.");
        if (body.password() == null || body.password().length() < 8) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Password must be at least 8 characters.");
        }
        user.passwordHash = passwords.hash(body.password());
        users.save(user);
        staffSessions.deleteByUserId(user.id);
        audit.record(user, "PASSWORD_RESET", "Password reset completed", clientIp(request));
        return Map.of("status", "updated", "message", "Password updated. You can now sign in.");
    }

    @PostMapping("/me/password-change")
    public Map<String, String> changePassword(@RequestHeader("Authorization") String auth,
                                              @RequestBody PasswordChange body,
                                              HttpServletRequest request) {
        User user = sessions.require(auth);
        if (!passwords.matches(body.current_password(), user.passwordHash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect.");
        }
        if (body.new_password() == null || body.new_password().length() < 8) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "New password must be at least 8 characters.");
        }
        user.passwordHash = passwords.hash(body.new_password());
        users.save(user);
        audit.record(user, "PASSWORD_CHANGE", "Password changed while signed in", clientIp(request));
        return Map.of("status", "updated", "message", "Password updated successfully.");
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
