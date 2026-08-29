package tz.go.bukobamc.meetings.model;
import jakarta.persistence.*; import java.time.OffsetDateTime; import java.util.*;
@Entity public class Meeting {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @Column(unique=true,nullable=false) public String reference; public String title; @Column(length=4000) public String purpose; public OffsetDateTime startAt; public OffsetDateTime endAt; public String location; public String mapLink; public String virtualLink; public String department; public String meetingType="internal"; public String priority="normal"; public String status="draft"; public Long createdBy; public OffsetDateTime createdAt=OffsetDateTime.now();
 @OneToMany(mappedBy="meeting",cascade=CascadeType.ALL,orphanRemoval=true) public List<Guest> guests=new ArrayList<>();
}
