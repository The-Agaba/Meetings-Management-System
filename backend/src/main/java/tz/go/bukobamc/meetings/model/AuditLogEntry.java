package tz.go.bukobamc.meetings.model;
import jakarta.persistence.*; import java.time.OffsetDateTime;
@Entity @Table(name="audit_log_entries") public class AuditLogEntry { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; public Long userId; @Column(nullable=false) public String action; public String entity; public Long entityId; @Column(length=2000) public String detail; public OffsetDateTime createdAt=OffsetDateTime.now(); }
