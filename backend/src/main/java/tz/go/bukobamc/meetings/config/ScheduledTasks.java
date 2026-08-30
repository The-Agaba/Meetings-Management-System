package tz.go.bukobamc.meetings.config;

import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tz.go.bukobamc.meetings.repo.OTPVerificationRepository;
import tz.go.bukobamc.meetings.repo.StaffSessionRepository;
import tz.go.bukobamc.meetings.repo.UserRepository;
import tz.go.bukobamc.meetings.security.SessionService;

import java.time.OffsetDateTime;
import java.util.logging.Logger;

@Component
@EnableScheduling
public class ScheduledTasks {
    private static final Logger LOG = Logger.getLogger(ScheduledTasks.class.getName());

    private final UserRepository users;
    private final OTPVerificationRepository otps;
    private final StaffSessionRepository staffSessions;
    private final SessionService sessions;

    public ScheduledTasks(UserRepository users, OTPVerificationRepository otps,
                          StaffSessionRepository staffSessions, SessionService sessions) {
        this.users = users;
        this.otps = otps;
        this.staffSessions = staffSessions;
        this.sessions = sessions;
    }

    /** Remove pending registrations older than 24 hours (SRS FR-4.3). */
    @Scheduled(cron = "0 15 * * * *")
    public void expirePendingRegistrations() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusHours(24);
        users.findByStatusAndCreatedAtBefore("pending", cutoff).forEach(user -> {
            otps.deleteByUserId(user.id);
            staffSessions.deleteByUserId(user.id);
            users.delete(user);
            LOG.info("Expired pending registration for " + user.email);
        });
    }

    @Scheduled(cron = "0 30 * * * *")
    public void purgeExpiredSessions() {
        sessions.purgeExpired();
    }
}
