package tz.go.bukobamc.meetings.service;

public final class TanzaniaPhone {
    private TanzaniaPhone() {}

    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String value = raw.trim();
        if (value.matches("0\\d{9}")) return "+255" + value.substring(1);
        if (value.matches("\\+255\\d{9}")) return value;
        throw new IllegalArgumentException("Phone number must use 0XXXXXXXXX or +255XXXXXXXXX with exactly 9 digits after the prefix.");
    }
}
