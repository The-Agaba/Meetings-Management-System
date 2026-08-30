package tz.go.bukobamc.meetings.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tz.go.bukobamc.meetings.model.StaffSession;
import tz.go.bukobamc.meetings.model.User;
import tz.go.bukobamc.meetings.repo.StaffSessionRepository;
import tz.go.bukobamc.meetings.repo.UserRepository;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class SessionService {
    private final StaffSessionRepository sessions;
    private final UserRepository users;
    private final int sessionDays;

    public SessionService(StaffSessionRepository sessions, UserRepository users,
                          @Value("${bmc.session-days:7}") int sessionDays) {
        this.sessions = sessions;
        this.users = users;
        this.sessionDays = sessionDays;
    }

    public String create(User user) {
        StaffSession session = new StaffSession();
        session.token = UUID.randomUUID().toString();
        session.userId = user.id;
        session.createdAt = OffsetDateTime.now();
        session.expiresAt = OffsetDateTime.now().plusDays(sessionDays);
        sessions.save(session);
        return session.token;
    }

    public User require(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Session expired. Please sign in again.");
        }
        String token = authorizationHeader.substring(7).trim();
        StaffSession session = sessions.findById(token)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Session expired. Please sign in again."));
        if (session.expiresAt.isBefore(OffsetDateTime.now())) {
            sessions.delete(session);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Session expired. Please sign in again.");
        }
        return users.findById(session.userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Session expired. Please sign in again."));
    }

    public void revoke(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) return;
        sessions.findById(authorizationHeader.substring(7).trim()).ifPresent(sessions::delete);
    }

    public void purgeExpired() {
        sessions.findByExpiresAtBefore(OffsetDateTime.now()).forEach(sessions::delete);
    }
}
