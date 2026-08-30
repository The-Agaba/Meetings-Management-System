package tz.go.bukobamc.meetings.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tz.go.bukobamc.meetings.model.StaffSession;
import java.time.OffsetDateTime;
import java.util.List;

public interface StaffSessionRepository extends JpaRepository<StaffSession, String> {
    List<StaffSession> findByExpiresAtBefore(OffsetDateTime time);
    void deleteByUserId(Long userId);
}
