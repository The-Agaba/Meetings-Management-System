package tz.go.bukobamc.meetings.model;
import jakarta.persistence.*; import java.time.OffsetDateTime;
@Entity @Table(name="otp_verifications") public class OTPVerification { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @ManyToOne(optional=false) public User user; public String channel; @Column(nullable=false) public String codeHash; public OffsetDateTime expiresAt; public int attemptCount; public OffsetDateTime lastSentAt; public int resendCount; public boolean used=false; }
