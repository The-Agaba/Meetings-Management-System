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
    private final int templateParameterCount;

    public InvitationAsyncService(
            WhatsAppCloudService whatsappService,
            InvitationRepository invitationRepo,
            @Value("${bmc.whatsapp-default-phone-id:}") String defaultPhoneNumberId,
            @Value("${bmc.whatsapp-template-name:hello_world}") String templateName,
            @Value("${bmc.whatsapp-template-language:en_US}") String templateLanguage,
            @Value("${bmc.whatsapp-template-parameter-count:0}") int templateParameterCount) {
        this.whatsappService = whatsappService;
        this.invitationRepo = invitationRepo;
        this.defaultPhoneNumberId = defaultPhoneNumberId;
        this.templateName = templateName;
        this.templateLanguage = templateLanguage;
        this.templateParameterCount = templateParameterCount;
    }

    @Async("whatsappTaskExecutor")
    public void sendWhatsAppInvitationsAsync(Meeting meeting, User sender, List<Map<String, Object>> invitationData) {
        if (!whatsappService.isEnabled()) {
            markFailed(invitationData, "WhatsApp is disabled or not configured");
            return;
        }

        // Determine sender Phone Number ID (User's connected number, fallback to default)
        String phoneNumberId = defaultPhoneNumberId;
        if (sender.whatsappConnected && sender.whatsappPhoneNumberId != null && !sender.whatsappPhoneNumberId.isBlank()) {
            phoneNumberId = sender.whatsappPhoneNumberId;
        }

        if (phoneNumberId == null || phoneNumberId.isBlank()) {
            System.err.println("No WhatsApp Phone Number ID available to send invitations.");
            markFailed(invitationData, "No WhatsApp phone number ID is configured");
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
            
                List<String> availableParams = List.of(
                    meeting.title,
                    meeting.reference,
                    meeting.startAt.toLocalDate().toString(),
                    Objects.toString(meeting.location, "Virtual"),
                    rsvpLink
            );
                int parameterCount = Math.max(0, Math.min(templateParameterCount, availableParams.size()));
                List<String> params = availableParams.subList(0, parameterCount);

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

    private void markFailed(List<Map<String, Object>> invitationData, String reason) {
        for (Map<String, Object> data : invitationData) {
            Invitation invitation = (Invitation) data.get("invitation");
            invitation.whatsappStatus = "FAILED";
            invitation.whatsappError = reason;
            invitationRepo.save(invitation);
        }
    }
}
