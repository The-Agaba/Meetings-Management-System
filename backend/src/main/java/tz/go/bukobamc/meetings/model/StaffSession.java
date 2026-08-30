package tz.go.bukobamc.meetings.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "staff_sessions")
public class StaffSession {
    @Id
    @Column(length = 64)
    public String token;
    @Column(nullable = false)
    public Long userId;
    @Column(nullable = false)
    public OffsetDateTime expiresAt;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
