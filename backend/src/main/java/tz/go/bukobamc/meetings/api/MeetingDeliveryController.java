package tz.go.bukobamc.meetings.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tz.go.bukobamc.meetings.model.*;
import tz.go.bukobamc.meetings.repo.*;
import tz.go.bukobamc.meetings.security.PasswordService;
import tz.go.bukobamc.meetings.security.SessionService;
import tz.go.bukobamc.meetings.service.AuditService;
import tz.go.bukobamc.meetings.service.InvitationAsyncService;
import tz.go.bukobamc.meetings.service.NotificationService;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/meetings")
public class MeetingDeliveryController {
    private final MeetingRepository meetings;
    private final GuestRepository guests;
    private final InvitationRepository invitations;
    private final SessionService sessions;
    private final NotificationService notifications;
    private final InvitationAsyncService whatsapp;
    private final AuditService audit;
    private final String baseUrl;

    public MeetingDeliveryController(MeetingRepository meetings, GuestRepository guests, InvitationRepository invitations,
                                     SessionService sessions, NotificationService notifications, InvitationAsyncService whatsapp,
                                     AuditService audit, @Value("${bmc.public-base-url}") String baseUrl) {
        this.meetings = meetings;
        this.guests = guests;
        this.invitations = invitations;
        this.sessions = sessions;
        this.notifications = notifications;
        this.whatsapp = whatsapp;
        this.audit = audit;
        this.baseUrl = baseUrl;
    }

    public record InviteRequest(String channel) {}

    @PostMapping("/{id}/send-invites-selected")
    public Object sendSelected(@RequestHeader("Authorization") String auth, @PathVariable Long id,
                               @RequestBody InviteRequest request) {
        User user = requireOwner(auth, id);
        Meeting meeting = meetings.findById(id).orElseThrow();
        String channel = request == null || request.channel() == null ? "both" : request.channel().toLowerCase();
        if (!Set.of("email", "whatsapp", "both").contains(channel)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Channel must be email, whatsapp, or both");
        }

        List<Map<String, Object>> whatsappData = new ArrayList<>();
        int sent = 0;
        for (Guest guest : guests.findByMeetingId(id)) {
            boolean sendEmail = ("email".equals(channel) || "both".equals(channel)) && guest.email != null && !guest.email.isBlank();
            boolean sendWhatsApp = ("whatsapp".equals(channel) || "both".equals(channel)) && guest.phone != null && !guest.phone.isBlank();
            if (!sendEmail && !sendWhatsApp) continue;

            String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(UUID.randomUUID().toString().getBytes(StandardCharsets.UTF_8));
            Invitation invitation = new Invitation();
            invitation.meeting = meeting;
            invitation.guest = guest;
            invitation.tokenHash = PasswordService.legacySha256(raw);
            invitation.sentAt = OffsetDateTime.now();
            invitation.deliveryStatus = "sent";
            if (sendEmail) {
                try {
                    notifications.meetingInvitationEmail(guest, meeting, user.name,
                        baseUrl + "/attendance.html?token=" + raw, baseUrl + "/rsvp.html?token=" + raw);
                    invitation.emailStatus = "SENT";
                } catch (Exception error) {
                    invitation.emailStatus = "FAILED";
                    invitation.emailError = error.getMessage();
                }
            }
            invitation = invitations.save(invitation);
            if (sendWhatsApp) {
                whatsappData.add(Map.of("invitation", invitation, "rawToken", raw, "baseUrl", baseUrl));
            }
            sent++;
        }
        meeting.status = "published";
        meetings.save(meeting);
        if (!whatsappData.isEmpty()) whatsapp.sendWhatsAppInvitationsAsync(meeting, user, whatsappData);
        audit.record(user, "INVITATIONS_SENT", "Sent " + channel + " invitations for " + meeting.reference, null);
        return Map.of("sent", sent, "channel", channel);
    }

    @GetMapping("/{id}/delivery-logs")
    public Object deliveryLogs(@RequestHeader("Authorization") String auth, @PathVariable Long id,
                               @RequestParam(defaultValue = "all") String channel) {
        requireOwner(auth, id);
        Map<String, Map<String, Object>> latestByRecipient = new LinkedHashMap<>();
        invitations.findByMeetingId(id).stream().map(inv -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("guest_id", inv.guest.id);
            row.put("guest", inv.guest.name);
            row.put("email", inv.guest.email == null ? "" : inv.guest.email);
            row.put("phone", inv.guest.phone == null ? "" : inv.guest.phone);
            row.put("email_status", Objects.toString(inv.emailStatus, "PENDING"));
            row.put("email_error", Objects.toString(inv.emailError, ""));
            row.put("whatsapp_status", Objects.toString(inv.whatsappStatus, "PENDING"));
            row.put("whatsapp_error", Objects.toString(inv.whatsappError, ""));
            row.put("sent_at", inv.sentAt);
            row.put("supporting_document", inv.response != null && inv.response.supportingDocumentUrl != null && !inv.response.supportingDocumentUrl.isBlank());
            return row;
        }).filter(row -> {
            if ("all".equalsIgnoreCase(channel)) return true;
            if ("email".equalsIgnoreCase(channel)) {
                return !"SENT".equalsIgnoreCase(String.valueOf(row.get("email_status")));
            }
            return !Set.of("SENT", "DELIVERED", "READ").contains(String.valueOf(row.get("whatsapp_status")).toUpperCase());
        }).forEach(row -> {
            String phone = String.valueOf(row.get("phone"));
            String email = String.valueOf(row.get("email"));
            String recipient = !phone.isBlank() ? "phone:" + phone : "email:" + email.toLowerCase();
            Map<String, Object> previous = latestByRecipient.get(recipient);
            if (previous == null || String.valueOf(row.get("sent_at")).compareTo(String.valueOf(previous.get("sent_at"))) >= 0) {
                latestByRecipient.put(recipient, row);
            }
        });
        return new ArrayList<>(latestByRecipient.values());
    }

    @GetMapping("/{meetingId}/guests/{guestId}/supporting-document")
    public ResponseEntity<Void> supportingDocument(@RequestHeader("Authorization") String auth,
                                                    @PathVariable Long meetingId, @PathVariable Long guestId) {
        requireOwner(auth, meetingId);
        Guest guest = guests.findById(guestId)
            .filter(item -> Objects.equals(item.meeting.id, meetingId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Guest not found"));
        Invitation invitation = invitations.findByMeetingId(meetingId).stream()
            .filter(item -> Objects.equals(item.guest.id, guestId) && item.response != null)
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supporting document not found"));
        String url = invitation.response.supportingDocumentUrl;
        if (url == null || url.isBlank()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Supporting document not found");
        return ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, URI.create(url).toString()).build();
    }

    private User requireOwner(String auth, Long meetingId) {
        User user = sessions.require(auth);
        Meeting meeting = meetings.findById(meetingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meeting not found"));
        if (!"admin".equals(user.role) && !Objects.equals(user.id, meeting.createdBy)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the meeting creator may access this area");
        }
        return user;
    }
}
