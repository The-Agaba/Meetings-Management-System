package tz.go.bukobamc.meetings.service;

import org.springframework.stereotype.Service;
import tz.go.bukobamc.meetings.model.AuditLog;
import tz.go.bukobamc.meetings.model.User;
import tz.go.bukobamc.meetings.repo.AuditLogRepository;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class AuditService {
    private final AuditLogRepository logs;

    public AuditService(AuditLogRepository logs) {
        this.logs = logs;
    }

    public void record(User user, String action, String detail, String ip) {
        AuditLog entry = new AuditLog();
        entry.userId = user != null ? user.id : null;
        entry.email = user != null ? user.email : null;
        entry.action = action;
        entry.detail = detail;
        entry.ipAddress = ip;
        logs.save(entry);
    }

    public void record(String email, String action, String detail, String ip) {
        AuditLog entry = new AuditLog();
        entry.email = email;
        entry.action = action;
        entry.detail = detail;
        entry.ipAddress = ip;
        logs.save(entry);
    }

    public List<Map<String, Object>> findRecent() {
        return logs.findTop200ByOrderByCreatedAtDesc().stream()
            .map(entry -> Map.<String, Object>of(
                "id", entry.id,
                "email", Objects.toString(entry.email, ""),
                "action", entry.action,
                "detail", Objects.toString(entry.detail, ""),
                "ip", Objects.toString(entry.ipAddress, ""),
                "at", entry.createdAt
            ))
            .toList();
    }
}
