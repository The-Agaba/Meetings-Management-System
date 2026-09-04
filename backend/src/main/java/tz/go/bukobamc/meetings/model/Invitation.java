package tz.go.bukobamc.meetings.model;
import jakarta.persistence.*; import java.time.OffsetDateTime;
@Entity public class Invitation { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @ManyToOne(optional=false) public Meeting meeting; @ManyToOne(optional=false) public Guest guest; @Column(unique=true,nullable=false) public String tokenHash; public String deliveryStatus="pending"; public OffsetDateTime sentAt; 
 public String whatsappMessageId; public String whatsappStatus; public String whatsappError; public OffsetDateTime whatsappDeliveredAt; public OffsetDateTime whatsappReadAt;
 @OneToOne(mappedBy="invitation",cascade=CascadeType.ALL,fetch=FetchType.EAGER) public RsvpResponse response; }
