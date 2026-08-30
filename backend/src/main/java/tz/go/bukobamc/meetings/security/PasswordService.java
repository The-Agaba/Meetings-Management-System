package tz.go.bukobamc.meetings.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
public class PasswordService {
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    public String hash(String raw) {
        return encoder.encode(raw);
    }

    /** Matches BCrypt hashes; transparently upgrades legacy SHA-256 hex hashes. */
    public boolean matches(String raw, String stored) {
        if (stored == null || stored.isBlank()) return false;
        if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
            return encoder.matches(raw, stored);
        }
        return legacySha256(raw).equals(stored);
    }

    public boolean isLegacyHash(String stored) {
        return stored != null && !stored.startsWith("$2");
    }

    public static String legacySha256(String value) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
