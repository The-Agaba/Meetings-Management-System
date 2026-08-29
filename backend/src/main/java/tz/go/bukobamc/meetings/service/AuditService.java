package tz.go.bukobamc.meetings.service;

import org.springframework.stereotype.Service;
import tz.go.bukobamc.meetings.model.AuditLogEntry;
import tz.go.bukobamc.meetings.repo.AuditLogEntryRepository;

import java.time.OffsetDateTime;

@Service
public class AuditService {
    private final AuditLogEntryRepository entries;

    public AuditService(AuditLogEntryRepository entries) { this.entries = entries; }

    public void record(Long userId, String action, String entity, Long entityId, String detail) {
        AuditLogEntry e = new AuditLogEntry();
        e.userId = userId;
        e.action = action;
        e.entity = entity;
        e.entityId = entityId;
        e.detail = detail == null ? "" : (detail.length() > 2000 ? detail.substring(0, 2000) : detail);
        e.createdAt = OffsetDateTime.now();
        entries.save(e);
    }
}
