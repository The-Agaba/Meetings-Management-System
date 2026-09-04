package tz.go.bukobamc.meetings.model;
import jakarta.persistence.*; import java.time.OffsetDateTime;
@Entity public class RsvpResponse { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @OneToOne(optional=false) public Invitation invitation; public String status; @Column(length=1000) public String reason; public String supportingDocumentUrl; public String language="en"; public OffsetDateTime respondedAt=OffsetDateTime.now(); }
