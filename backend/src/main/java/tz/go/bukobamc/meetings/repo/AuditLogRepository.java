package tz.go.bukobamc.meetings.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tz.go.bukobamc.meetings.model.AuditLog;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop200ByOrderByCreatedAtDesc();
}
