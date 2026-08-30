package tz.go.bukobamc.meetings.service;

import org.springframework.stereotype.Service;
import tz.go.bukobamc.meetings.model.Guest;
import tz.go.bukobamc.meetings.model.Meeting;

import java.util.List;

@Service
public class MeetingNoticeService {
    private final NotificationService notifications;
    private final EmailTemplateService templates;

    public MeetingNoticeService(NotificationService notifications, EmailTemplateService templates) {
        this.notifications = notifications;
        this.templates = templates;
    }

    public int notifyReschedule(Meeting meeting, List<Guest> guests, String customNote) {
        String subject = "Meeting rescheduled: " + meeting.title;
        String html = templates.meetingReschedule(meeting, customNote);
        String plain = templates.meetingReschedulePlain(meeting, customNote);
        return dispatch(guests, subject, html, plain);
    }

    public int notifyCancellation(Meeting meeting, List<Guest> guests, String reason) {
        String subject = "Meeting cancelled: " + meeting.title;
        String html = templates.meetingCancellation(meeting, reason);
        String plain = templates.meetingCancellationPlain(meeting, reason);
        return dispatch(guests, subject, html, plain);
    }

    private int dispatch(List<Guest> guests, String subject, String htmlBody, String plainBody) {
        int sent = 0;
        for (Guest guest : guests) {
            boolean delivered = false;
            if (guest.phone != null && !guest.phone.isBlank()) {
                notifications.whatsappQuiet(guest.phone, plainBody);
                delivered = true;
            }
            if (guest.email != null && !guest.email.isBlank()) {
                notifications.emailHtml(guest.email, subject, htmlBody, plainBody);
                delivered = true;
            }
            if (delivered) sent++;
        }
        return sent;
    }
}
