package tz.go.bukobamc.meetings.service;

import org.springframework.stereotype.Service;
import tz.go.bukobamc.meetings.model.Guest;
import tz.go.bukobamc.meetings.model.Meeting;

import java.time.format.DateTimeFormatter;
import java.util.Objects;

@Service
public class EmailTemplateService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("EEEE, dd MMMM yyyy");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter RANGE = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");

    public String verificationCode(String recipientName, String code, String headline, String instructions) {
        String greeting = recipientName != null && !recipientName.isBlank()
            ? "Hello <strong>" + escape(recipientName) + "</strong>,"
            : "Hello,";
        return layout(
            "#1B5E20",
            "Verification",
            headline,
            """
            <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;">%s</p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7;">%s</p>
            %s
            <p style="margin:28px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
              If you did not request this code, you can safely ignore this email.
              The code expires in <strong>10 minutes</strong>.
            </p>
            """.formatted(greeting, escape(instructions), codeBlock(code, "Your verification code"))
        );
    }

    public String meetingInvitation(Guest guest, Meeting meeting, String organizerName, String checkInLink, String rsvpLink) {
        if ("virtual".equalsIgnoreCase(meeting.meetingType)) {
            return virtualMeetingInvitation(guest, meeting, organizerName, rsvpLink);
        }
        return layout(
            "#1B5E20",
            "Meeting invitation",
            "You're invited",
            """
            <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;">
              Hello <strong>%s</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
              You have been invited to attend the following meeting organised by
              <strong>%s</strong> through the Bukoba Municipal Council meeting system.
            </p>
            %s
            %s
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
              Please respond to the invitation first. For physical meetings, participants who select Confirmed or Tentative can sign in; declined responses cannot.
              Check-in opens <strong>30 minutes before</strong> the meeting and closes <strong>30 minutes after</strong> it starts.
            </p>
            %s
            <p style="margin:18px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">After confirming attendance, use your personal check-in link at the meeting. Please keep this link private.</p>
            <p style="margin:8px 0 0;font-size:13px;"><a href="%s" style="color:#1B5E20;font-weight:700;">Open personal check-in link</a></p>
            """.formatted(
                escape(guest.name),
                escape(organizerName),
                meetingDetails(meeting),
                ctaButton("Respond to invitation", rsvpLink),
                escapeAttr(checkInLink)
            )
        );
    }

    public String meetingReschedule(Meeting meeting, String customNote) {
        String note = customNote != null && !customNote.isBlank()
            ? infoBox("Note from organiser", escape(customNote.trim()))
            : "";
        return layout(
            "#F9A825",
            "Schedule update",
            "Meeting rescheduled",
            """
            <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.7;">
              The meeting <strong>%s</strong> has been rescheduled. Please review the updated details below.
            </p>
            %s
            %s
            """.formatted(escape(meeting.title), meetingDetails(meeting), note)
        );
    }

    public String meetingCancellation(Meeting meeting, String reason) {
        String reasonBlock = reason != null && !reason.isBlank()
            ? infoBox("Reason for cancellation", escape(reason.trim()))
            : "";
        return layout(
            "#B91C1C",
            "Cancellation",
            "Meeting cancelled",
            """
            <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.7;">
              The meeting <strong>%s</strong> scheduled for
              <strong>%s</strong> has been cancelled.
            </p>
            %s
            %s
            """.formatted(
                escape(meeting.title),
                escape(meeting.startAt.format(RANGE)),
                reasonBlock,
                referenceBadge(meeting.reference)
            )
        );
    }

    public String meetingInvitationPlain(Guest guest, Meeting meeting, String organizerName, String checkInLink, String rsvpLink) {
        if ("virtual".equalsIgnoreCase(meeting.meetingType)) {
            return virtualMeetingInvitationPlain(guest, meeting, organizerName, rsvpLink);
        }
        return """
            You're Invited to a Meeting

            Hello %s,

            You have been invited to %s.
            Date: %s
            Time: %s – %s
            Location: %s

            %s

            RSVP is required before attendance check-in. Confirm, decline, or mark tentative here: %s
            For physical meetings, participants who select Confirmed or Tentative can sign in; declined responses cannot.

            Your personal check-in link: %s
            Check-in opens 30 minutes before the meeting and closes 30 minutes after it starts. Please keep this link private.

            Organizer: %s
            Reference: %s
            Bukoba Municipal Council
            """.formatted(
            guest.name,
            meeting.title,
            meeting.startAt.toLocalDate(),
            meeting.startAt.toLocalTime(),
            meeting.endAt.toLocalTime(),
            Objects.toString(meeting.location, "To be confirmed"),
            Objects.toString(meeting.purpose, ""),
            rsvpLink,
            checkInLink,
            organizerName,
            meeting.reference
        ).trim();
    }

    private String virtualMeetingInvitation(Guest guest, Meeting meeting, String organizerName, String rsvpLink) {
        return layout(
            "#418fde",
            "Virtual meeting invitation",
            "You're invited online",
            """
            <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;">Hello <strong>%s</strong>,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
              You have been invited to join this online meeting organised by <strong>%s</strong> through the Bukoba Municipal Council meeting system.
            </p>
            %s
            %s
            <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.6;">
              Please submit your RSVP before the scheduled time. Use the RSVP link below to confirm, decline, or mark tentative; the invitation can only be answered once.
            </p>
            <a href="%s" style="display:inline-block;padding:11px 20px;background:#eef2ff;color:#1e3a5f;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;">Respond to invitation</a>
            """.formatted(escape(guest.name), escape(organizerName), meetingDetails(meeting), ctaButton("Join virtual meeting", meeting.virtualLink), escapeAttr(rsvpLink))
        );
    }

    private String virtualMeetingInvitationPlain(Guest guest, Meeting meeting, String organizerName, String rsvpLink) {
        return """
            You're Invited to an Online Meeting

            Hello %s,

            You have been invited to join "%s", organised by %s.
            Date: %s
            Time: %s – %s
            Meeting link: %s

            RSVP (required before joining): %s
            Reference: %s
            Bukoba Municipal Council
            """.formatted(
            guest.name, meeting.title, organizerName,
            meeting.startAt.format(DATE), meeting.startAt.format(TIME), meeting.endAt.format(TIME),
            meeting.virtualLink, rsvpLink, meeting.reference
        ).trim();
    }

    public String meetingReschedulePlain(Meeting meeting, String customNote) {
        StringBuilder sb = new StringBuilder();
        sb.append("Meeting Schedule Update\n\n");
        sb.append("The meeting \"").append(meeting.title).append("\" has been rescheduled.\n\n");
        sb.append("New date: ").append(meeting.startAt.toLocalDate()).append("\n");
        sb.append("New time: ").append(meeting.startAt.format(RANGE))
            .append(" – ").append(meeting.endAt.format(RANGE)).append("\n");
        sb.append("Location: ").append(Objects.toString(meeting.location, "To be confirmed")).append("\n\n");
        if (meeting.purpose != null && !meeting.purpose.isBlank()) {
            sb.append("Purpose: ").append(meeting.purpose).append("\n\n");
        }
        if (customNote != null && !customNote.isBlank()) {
            sb.append("Note from organiser: ").append(customNote.trim()).append("\n\n");
        }
        sb.append("Reference: ").append(meeting.reference).append("\n");
        sb.append("Bukoba Municipal Council");
        return sb.toString();
    }

    public String meetingCancellationPlain(Meeting meeting, String reason) {
        StringBuilder sb = new StringBuilder();
        sb.append("Meeting Cancellation Notice\n\n");
        sb.append("The meeting \"").append(meeting.title).append("\" scheduled for ");
        sb.append(meeting.startAt.format(RANGE)).append(" has been cancelled.\n\n");
        if (reason != null && !reason.isBlank()) {
            sb.append("Reason: ").append(reason.trim()).append("\n\n");
        }
        sb.append("Reference: ").append(meeting.reference).append("\n");
        sb.append("Bukoba Municipal Council");
        return sb.toString();
    }

    public String verificationCodePlain(String code, String purpose) {
        return purpose + "\n\nYour verification code is " + code + ". It expires in 10 minutes.\n\nBukoba Municipal Council";
    }

    private String meetingDetails(Meeting meeting) {
        String purpose = meeting.purpose != null && !meeting.purpose.isBlank()
            ? """
              <tr>
                <td style="padding:10px 0;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;vertical-align:top;width:110px;">Purpose</td>
                <td style="padding:10px 0;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;line-height:1.6;">%s</td>
              </tr>
              """.formatted(escape(meeting.purpose))
            : "";
        String location = Objects.toString(meeting.location, "");
        String locationRow = !location.isBlank()
            ? detailRow("Location", escape(location))
            : "";
        String virtual = Objects.toString(meeting.virtualLink, "");
        String virtualRow = !virtual.isBlank()
            ? detailRow("Virtual link", "<a href=\"" + escapeAttr(virtual) + "\" style=\"color:#1565C0;\">" + escape(virtual) + "</a>")
            : "";
        return """
            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                   style="margin:0 0 24px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
              <tr>
                <td style="padding:20px 22px;">
                  <p style="margin:0 0 14px;font-size:18px;font-weight:700;color:#111827;">%s</p>
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
                    %s
                    %s
                    %s
                    %s
                    %s
                  </table>
                </td>
              </tr>
            </table>
            %s
            """.formatted(
            escape(meeting.title),
            detailRow("Date", escape(meeting.startAt.format(DATE))),
            detailRow("Time", escape(meeting.startAt.format(TIME) + " – " + meeting.endAt.format(TIME))),
            locationRow,
            virtualRow,
            purpose,
            referenceBadge(meeting.reference)
        );
    }

    private String detailRow(String label, String value) {
        return """
            <tr>
              <td style="padding:10px 0;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;vertical-align:top;width:110px;">%s</td>
              <td style="padding:10px 0;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;line-height:1.6;">%s</td>
            </tr>
            """.formatted(escape(label), value);
    }

    private String referenceBadge(String reference) {
        return """
            <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
              Reference: <span style="display:inline-block;padding:4px 10px;background:#eef2ff;color:#3730a3;border-radius:999px;font-weight:600;">%s</span>
            </p>
            """.formatted(escape(reference));
    }

    private String codeBlock(String code, String label) {
        return """
            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background:#f0fdf4;border:2px dashed #1B5E20;border-radius:12px;padding:28px 20px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:2px;color:#1B5E20;text-transform:uppercase;">%s</p>
                  <p style="margin:0;font-size:44px;font-weight:800;letter-spacing:10px;color:#14532d;font-family:'Courier New',Courier,monospace;">%s</p>
                </td>
              </tr>
            </table>
            """.formatted(escape(label), escape(code));
    }

    private String ctaButton(String label, String href) {
        return """
            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td align="center">
                  <a href="%s" style="display:inline-block;padding:14px 28px;background:#1565C0;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;">
                    %s
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 20px;font-size:12px;color:#9ca3af;word-break:break-all;">
              Or copy this link: <a href="%s" style="color:#1565C0;">%s</a>
            </p>
            """.formatted(escapeAttr(href), escape(label), escapeAttr(href), escape(href));
    }

    private String infoBox(String title, String body) {
        return """
            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
              <tr>
                <td style="padding:16px 18px;background:#fffbeb;border-left:4px solid #F9A825;border-radius:8px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">%s</p>
                  <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">%s</p>
                </td>
              </tr>
            </table>
            """.formatted(escape(title), body);
    }

    private String layout(String accent, String badge, String title, String bodyHtml) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
              <title>%s</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 12px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="560" cellpadding="0" cellspacing="0"
                           style="max-width:560px;width:100%%;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">
                      <tr>
                        <td style="background:linear-gradient(135deg,#1B5E20 0%%,#2E7D32 55%%,#1565C0 100%%);padding:32px 36px;text-align:center;">
                          <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:2px;color:#F9A825;text-transform:uppercase;">Bukoba Municipal Council</p>
                          <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;color:#ffffff;">BMC Meeting System</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="height:4px;background:%s;font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                      <tr>
                        <td style="padding:36px 36px 28px;">
                          <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:%s;text-transform:uppercase;">%s</p>
                          <h2 style="margin:0 0 24px;font-size:26px;font-weight:700;color:#111827;line-height:1.3;">%s</h2>
                          %s
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 36px 32px;">
                          <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="border-top:1px solid #e5e7eb;padding-top:18px;font-size:12px;color:#9ca3af;line-height:1.6;text-align:center;">
                                Sent by Bukoba Municipal Council · BMC Meeting System<br/>
                                Please do not reply to this automated message.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(escape(title), accent, accent, escape(badge), escape(title), bodyHtml);
    }

    private static String escape(String value) {
        if (value == null) return "";
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }

    private static String escapeAttr(String value) {
        return escape(value);
    }
}
