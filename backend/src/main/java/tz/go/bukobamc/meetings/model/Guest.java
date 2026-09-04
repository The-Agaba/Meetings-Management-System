package tz.go.bukobamc.meetings.model;
import jakarta.persistence.*;
import tz.go.bukobamc.meetings.service.TanzaniaPhone;

@Entity
@Table(uniqueConstraints = {
	@UniqueConstraint(name = "uq_guest_meeting_phone", columnNames = {"meeting_id", "phone"}),
	@UniqueConstraint(name = "uq_guest_meeting_email", columnNames = {"meeting_id", "email"})
})
public class Guest {
	@Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
	@ManyToOne(optional=false) public Meeting meeting;
	public String name;
	public String phone;
	public String email;
	public String roleTitle;
	public String organization;

	@PrePersist
	@PreUpdate
	private void normalizeContactDetails() {
		phone = TanzaniaPhone.normalize(phone);
		email = email == null || email.isBlank() ? null : email.trim().toLowerCase();
	}
}
