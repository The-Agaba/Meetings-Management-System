package tz.go.bukobamc.meetings.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public Long userId;
    public String email;
    @Column(nullable = false)
    public String action;
    public String detail;
    public String ipAddress;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
