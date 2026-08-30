package tz.go.bukobamc.meetings.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tz.go.bukobamc.meetings.model.OTPVerification;
import tz.go.bukobamc.meetings.model.User;
import tz.go.bukobamc.meetings.repo.OTPVerificationRepository;
import tz.go.bukobamc.meetings.security.PasswordService;

import java.security.SecureRandom;
import java.time.OffsetDateTime;

@Service
public class OtpService {
    private static final int MAX_ATTEMPTS = 5;

    private final OTPVerificationRepository otps;
    private final int expiryMinutes;

    public OtpService(OTPVerificationRepository otps,
                      @Value("${bmc.otp-expiry-minutes:10}") int expiryMinutes) {
        this.otps = otps;
        this.expiryMinutes = expiryMinutes;
    }

    public String hashCode(String code) {
        return PasswordService.legacySha256(code);
    }

    public String issueAlphanumeric(User user, String channel) {
        SecureRandom random = new SecureRandom();
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 6; i++) code.append(chars.charAt(random.nextInt(chars.length())));
        save(user, channel, code.toString());
        return code.toString();
    }

    public String issueNumeric(User user, String channel) {
        String code = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        save(user, channel, code);
        return code;
    }

    private void save(User user, String channel, String code) {
        OTPVerification record = otps.findTopByUserIdAndChannelAndUsedFalseOrderByIdDesc(user.id, channel)
            .orElseGet(OTPVerification::new);
        record.user = user;
        record.channel = channel;
        record.codeHash = hashCode(code);
        record.expiresAt = OffsetDateTime.now().plusMinutes(expiryMinutes);
        record.attemptCount = 0;
        record.used = false;
        record.lastSentAt = OffsetDateTime.now();
        record.resendCount = record.id == null ? 0 : record.resendCount + 1;
        otps.save(record);
    }

    public void verify(User user, String channel, String code, String invalidMessage) {
        OTPVerification record = otps.findTopByUserIdAndChannelAndUsedFalseOrderByIdDesc(user.id, channel)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active OTP"));
        if (record.attemptCount >= MAX_ATTEMPTS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Too many failed attempts. Request a new verification code.");
        }
        if (code == null || record.expiresAt.isBefore(OffsetDateTime.now())
            || !hashCode(code.trim()).equals(record.codeHash)) {
            record.attemptCount++;
            otps.save(record);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, invalidMessage);
        }
        record.used = true;
        record.attemptCount = 0;
        otps.save(record);
    }
}
