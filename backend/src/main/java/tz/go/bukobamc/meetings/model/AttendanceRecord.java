package tz.go.bukobamc.meetings.model;
import jakarta.persistence.*; import java.time.OffsetDateTime;
@Entity @Table(name="attendance_records",uniqueConstraints=@UniqueConstraint(columnNames={"meeting_id","participant_id"})) public class AttendanceRecord { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @ManyToOne(optional=false) public Meeting meeting; @Column(name="participant_id",nullable=false) public Long participantId; @Column(nullable=false) public String personalTokenHash; public OffsetDateTime signedInAt; public boolean used=false; }
