package tz.go.bukobamc.meetings.model;
import jakarta.persistence.*; import java.time.OffsetDateTime;
@Entity @Table(name="qr_sessions") public class QRSession { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @ManyToOne(optional=false) public Meeting meeting; @Column(nullable=false) public String sessionTokenHash; public OffsetDateTime issuedAt; public OffsetDateTime expiresAt; }
