package tz.go.bukobamc.meetings.model;
import jakarta.persistence.*;
@Entity @Table(name="users") public class User {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(unique=true,nullable=false) public String email; @Column(nullable=false) public String passwordHash; public String role="organizer"; public String name; @Column(unique=true) public String phone; public String status="pending"; public boolean active=false; @Column(columnDefinition = "boolean default false") public boolean emailVerified=false; @Column(columnDefinition = "boolean default false") public boolean phoneVerified=false; public java.time.OffsetDateTime createdAt=java.time.OffsetDateTime.now();
}
