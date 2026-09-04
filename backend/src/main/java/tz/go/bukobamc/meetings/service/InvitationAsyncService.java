package tz.go.bukobamc.meetings.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import tz.go.bukobamc.meetings.model.Guest;
import tz.go.bukobamc.meetings.model.Invitation;
import tz.go.bukobamc.meetings.model.Meeting;
import tz.go.bukobamc.meetings.model.User;
import tz.go.bukobamc.meetings.repo.InvitationRepository;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
public class InvitationAsyncService {

    private final WhatsAppCloudService whatsappService;
    private final InvitationRepository invitationRepo;
    private final String defaultPhoneNumberId;
    private final String templateName;
    private final String templateLanguage;

    public InvitationAsyncService(
            WhatsAppCloudService whatsappService,
            InvitationRepository invitationRepo,
            @Value("${bmc.whatsapp-default-phone-id:}") String defaultPhoneNumberId,
            @Value("${bmc.whatsapp-template-name:meeting_invitation}") String templateName,
            @Value("${bmc.whatsapp-template-language:en_US}") String templateLanguage) {
        this.whatsappService = whatsappService;
        this.invitationRepo = invitationRepo;
        this.defaultPhoneNumberId = defaultPhoneNumberId;
        this.templateName = templateName;
        this.templateLanguage = templateLanguage;
    }

    @Async("whatsappTaskExecutor")
    public void sendWhatsAppInvitationsAsync(Meeting meeting, User sender, List<Map<String, Object>> invitationData) {
        if (!whatsappService.isEnabled()) {
            return;
        }

        // Determine sender Phone Number ID (User's connected number, fallback to default)
        String phoneNumberId = defaultPhoneNumberId;
        if (sender.whatsappConnected && sender.whatsappPhoneNumberId != null && !sender.whatsappPhoneNumberId.isBlank()) {
            phoneNumberId = sender.whatsappPhoneNumberId;
        }

        if (phoneNumberId == null || phoneNumberId.isBlank()) {
            System.err.println("No WhatsApp Phone Number ID available to send invitations.");
            return;
        }

        for (Map<String, Object> data : invitationData) {
            Invitation inv = (Invitation) data.get("invitation");
            String rawToken = (String) data.get("rawToken");
            String baseUrl = (String) data.get("baseUrl");

            if (inv.guest.phone == null || inv.guest.phone.isBlank()) {
                continue;
            }

            String rsvpLink = baseUrl + "/rsvp.html?token=" + rawToken; 
            
            // Expected Template Params: {{1}} Title, {{2}} Start Time, {{3}} Location, {{4}} RSVP Link
            List<String> params = List.of(
                    meeting.title,
                    meeting.startAt.toString(),
                    Objects.toString(meeting.location, "Virtual"),
                    rsvpLink
            );

            Map<String, Object> result = whatsappService.sendTemplate(
                    inv.guest.phone,
                    phoneNumberId,
                    templateName,
                    templateLanguage,
                    params
            );

            boolean sent = (Boolean) result.getOrDefault("sent", false);
            if (sent) {
                Map<String, Object> response = (Map<String, Object>) result.get("response");
                if (response != null && response.containsKey("messages")) {
                    List<Map<String, Object>> messages = (List<Map<String, Object>>) response.get("messages");
                    if (!messages.isEmpty()) {
                        String wamid = (String) messages.get(0).get("id");
                        inv.whatsappMessageId = wamid;
                        inv.whatsappStatus = "SENT";
                        invitationRepo.save(inv);
                    }
                }
            } else {
                inv.whatsappStatus = "FAILED";
                inv.whatsappError = String.valueOf(result.get("reason"));
                invitationRepo.save(inv);
            }

            // Pacing: Wait a bit to respect rate limits (80 msgs/sec limit, but we go slower)
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
}
