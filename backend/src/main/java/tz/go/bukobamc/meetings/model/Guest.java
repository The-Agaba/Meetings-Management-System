package tz.go.bukobamc.meetings.model;
import jakarta.persistence.*;
@Entity public class Guest { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @ManyToOne(optional=false) public Meeting meeting; public String name; public String phone; public String email; public String roleTitle; public String organization; }
