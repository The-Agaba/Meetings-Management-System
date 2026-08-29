# Database Schema Documentation

The Spring Boot JPA model uses PostgreSQL. Users create meetings. Meetings own guests. Each guest has one invitation per meeting. Each invitation has at most one RSVP response. In production, use encrypted volumes, daily backups, retention rules approved by BMC, and tested restoration.

Relationship: `User 1 to many Meeting`, `User 1 to many OTPVerification`, `Meeting 1 to many Guest`, `Meeting 1 to many Invitation`, `Guest 1 to many Invitation`, `Invitation 1 to zero or one RSVPResponse`, `Meeting 1 to many QRSession`, `Meeting 1 to many AttendanceRecord`, `User 1 to many AuditLogEntry`. OTP codes, invitation tokens, personal sign-in tokens, and QR session tokens are stored only as hashes.
