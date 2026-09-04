package tz.go.bukobamc.meetings.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tz.go.bukobamc.meetings.model.User;
import tz.go.bukobamc.meetings.repo.UserRepository;
import tz.go.bukobamc.meetings.security.SessionService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository users;
    private final SessionService sessions;

    public AdminController(UserRepository users, SessionService sessions) {
        this.users = users;
        this.sessions = sessions;
    }

    private User requireAdmin(String auth) {
        User user = sessions.require(auth);
        if (!"admin".equals(user.role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Requires admin privileges");
        }
        return user;
    }

    @GetMapping("/logs")
    public Object getLogs(@RequestHeader("Authorization") String auth,
                          @RequestParam(defaultValue = "1000") int lines) {
        requireAdmin(auth);
        Path logFile = Paths.get("logs/app.log");
        if (!Files.exists(logFile)) {
            return Map.of("logs", "Log file not found or has not been created yet.");
        }
        
        try (Stream<String> stream = Files.lines(logFile)) {
            List<String> allLines = stream.collect(Collectors.toList());
            int start = Math.max(0, allLines.size() - lines);
            List<String> tail = allLines.subList(start, allLines.size());
            return Map.of("logs", String.join("\n", tail));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read logs");
        }
    }

    @GetMapping("/logs/download")
    public ResponseEntity<byte[]> downloadLogs(@RequestHeader("Authorization") String auth) {
        requireAdmin(auth);
        Path logFile = Paths.get("logs/app.log");
        if (!Files.exists(logFile)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Log file not found or has not been created yet.");
        }
        try {
            byte[] content = Files.readAllBytes(logFile);
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=application.log")
                .contentType(MediaType.TEXT_PLAIN)
                .body(content);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to download logs", e);
        }
    }

    @GetMapping("/users")
    public Object listUsers(@RequestHeader("Authorization") String auth) {
        requireAdmin(auth);
        return users.findAll().stream()
            .map(u -> Map.of(
                "id", u.id,
                "name", u.name != null ? u.name : "",
                "email", u.email,
                "phone", u.phone != null ? u.phone : "",
                "role", u.role,
                "status", u.status,
                "active", u.active,
                "created_at", u.createdAt
            )).collect(Collectors.toList());
    }

    @PutMapping("/users/{id}")
    public Object updateUser(@RequestHeader("Authorization") String auth,
                             @PathVariable Long id,
                             @RequestBody Map<String, Object> body) {
        requireAdmin(auth);
        User target = users.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        if (body.containsKey("role")) {
            String newRole = (String) body.get("role");
            if (List.of("admin", "organizer", "staff").contains(newRole)) {
                target.role = newRole;
            }
        }
        if (body.containsKey("status")) {
            target.status = (String) body.get("status");
        }
        if (body.containsKey("active")) {
            target.active = (Boolean) body.get("active");
        }
        
        users.save(target);
        return Map.of("status", "success", "message", "User updated");
    }

    @DeleteMapping("/users/{id}")
    public Object deleteUser(@RequestHeader("Authorization") String auth,
                             @PathVariable Long id) {
        User admin = requireAdmin(auth);
        if (admin.id.equals(id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot delete your own account");
        }
        User target = users.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        users.delete(target);
        return Map.of("status", "success", "message", "User '" + target.name + "' deleted");
    }
}
