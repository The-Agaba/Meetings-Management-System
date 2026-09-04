# API Reference

Base URL: `/api`. Staff routes require `Authorization: Bearer <session token>` unless noted.

Errors return JSON: `{ "error": "...", "message": "...", "status": 401 }`.

## Health & auth

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Service health | None |
| POST | `/auth/register` | Register organiser `{name,email,phone,password}` | None |
| POST | `/auth/verify` | Verify registration OTP `{email,channel,code}` | None |
| POST | `/auth/resend` | Resend registration OTP `{email,channel}` | None |
| GET | `/auth/config` | `{whatsapp_enabled}` | None |
| POST | `/auth/login` | **Password-only** staff login → `{access_token,user}` | None |
| POST | `/auth/logout` | Revoke current session | Bearer |
| POST | `/auth/password-reset/request` | Send reset OTP `{email}` | None |
| POST | `/auth/password-reset/confirm` | Reset password `{email,code,password}` | None |

**OTP policy:** Email OTP is required for new organiser registration and for account email change. Staff sign-in uses password only (no login OTP).

## Profile

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/me` | Current user profile | Bearer |
| PUT | `/me` | Update `{name,phone}` | Bearer |
| POST | `/me/email-change/request` | OTP to new email `{email}` | Bearer |
| POST | `/me/email-change/verify` | Confirm email change `{email,code}` | Bearer |
| POST | `/me/password-change` | Change password `{current_password,new_password}` | Bearer |

## Meetings

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/meetings` | List meetings | Bearer |
| POST | `/meetings` | Create meeting | Bearer |
| GET | `/meetings/{id}` | Meeting detail, guests, counts, `can_manage` | Bearer |
| PUT | `/meetings/{id}` | Edit future meeting (organiser owner) | Bearer |
| POST | `/meetings/{id}/guests` | Add guest | Bearer |
| POST | `/meetings/{id}/guests/import` | Import CSV or XLSX (`file` multipart) | Bearer |
| POST | `/meetings/{id}/send-invites` | Send invitations | Bearer |
| POST | `/meetings/{id}/notify-reschedule` | Notify guests of schedule change `{message?}` | Bearer (owner) |
| POST | `/meetings/{id}/cancel` | Cancel meeting and notify guests `{reason}` | Bearer (owner) |
| GET | `/meetings/{id}/attendance/qr` | Session attendance QR | Bearer |
| GET | `/meetings/{id}/report.csv` | Attendance CSV export | Bearer |
| GET | `/meetings/{id}/report.pdf` | Attendance PDF export (official layout) | Bearer |

Guest import columns: `name`, `phone`, `email`, `organization`, `role_title`.

## Templates

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/templates/guest-import.xlsx` | Download guest import XLSX template | None |

## Public

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/rsvp/{token}` | RSVP page data | Token |
| POST | `/rsvp/{token}` | Submit RSVP `{status,reason,language}` | Token |
| GET | `/attendance/{token}` | Personal check-in page | Token |
| POST | `/attendance/sign-in` | QR check-in `{personal_token,qr_payload}` | Token |

## Admin

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/admin/accounts` | List accounts | Admin |
| PUT | `/admin/accounts/{id}` | Update `{role,active}` | Admin |
| GET | `/admin/attendance` | Cross-meeting attendance records | Admin |
| GET | `/admin/audit-logs` | Recent audit events | Admin |
| GET | `/admin/logs?lines=1000` | Read the latest application log lines | Admin |
| GET | `/admin/logs/download` | Download the complete `application.log` file | Admin |
| GET | `/admin/integrations` | WhatsApp configuration status | Admin |
| POST | `/admin/integrations/whatsapp-test` | Send a WhatsApp test `{phone,message?}` | Admin |

The admin interface also exports the loaded staff account, attendance, and audit data as CSV files in the browser. These exports do not create additional API routes.

## Security notes

- Staff sessions are stored in PostgreSQL (`staff_sessions`) and expire after `SESSION_DAYS` (default 7).
- Passwords use BCrypt (legacy SHA-256 hashes are upgraded on login).
- OTP attempts are limited to 5 per code; pending registrations expire after 24 hours.
