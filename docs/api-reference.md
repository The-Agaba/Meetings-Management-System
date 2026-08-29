# API Reference

Base URL: `/api`. Staff routes require `Authorization: Bearer <session token>`.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Service health | None |
| POST | `/auth/login` | Create staff session, body `{email,password}` | None |
| POST | `/auth/register` | Organiser self-registration, body `{name,email,phone,password}` | None |
| POST | `/auth/verify` | Verify an email or WhatsApp OTP, body `{email,channel,code}` | None |
| POST | `/auth/resend` | Resend an OTP, body `{email,channel}` | None |
| GET | `/me` | Current user | Staff |
| PUT | `/me` | Update organiser name and phone used for WhatsApp sender selection, body `{name,phone}` | Staff |
| GET | `/meetings` | List authorised meetings | Staff |
| POST | `/meetings` | Create meeting | Staff |
| GET | `/meetings/{id}` | Meeting, guests, RSVP counts | Staff |
| POST | `/meetings/{id}/guests` | Add guest | Staff |
| POST | `/meetings/{id}/guests/import` | Upload UTF-8 CSV or Excel (`.xlsx`, `.xls`) guest list; returns `{added,skipped:[{row,reason}]}` | Organiser or Admin, multipart `file` |
| POST | `/meetings/{id}/send-invites` | Create and dispatch invitations | Staff |
| PUT | `/meetings/{id}` | Edit a future meeting; rescheduling notifies every invitee | Organiser or Admin |
| POST | `/meetings/{id}/cancel` | Cancel a meeting and notify invitees, body `{reason}` | Organiser or Admin |
| POST | `/meetings/{id}/reminders` | Re-send invitations to guests who have not responded | Organiser or Admin |
| GET | `/meetings/{id}/audit` | Audit trail for one meeting | Organiser or Admin |
| GET | `/audit` | Most recent 200 council audit entries | Admin |
| GET | `/reports/summary` | Historical response and attendance trends across meetings | Admin |
| GET | `/meetings/{id}/attendance/qr` | Rotating Session QR Code payload, valid during the meeting window | Organiser or Admin |
| GET | `/attendance/{token}` | Personal Sign-In Link details and current attendance state | Token |
| POST | `/attendance/sign-in` | Record attendance, body `{personal_token,qr_payload}` | Token |
| GET | `/rsvp/{token}` | Public meeting details | Token |
| POST | `/rsvp/{token}` | Body `{status,reason,language}` | Token |
| GET | `/rsvp/{token}/calendar.ics` | Universal calendar file for Google, Outlook, Apple Calendar, and other apps | Token |
| GET | `/meetings/{id}/report.csv` | Attendance CSV export | Staff |

Successful meeting creation returns `{id,reference}`. RSVP returns `{status:"saved",message,hr_notice}`, where `hr_notice` is non-empty when a decline reason mentions leave; the system never processes leave applications itself. Errors use `{error,message,status}` with an HTTP 4xx status. Guest imports and invitation dispatch are recorded in the audit trail. The backend is Spring Boot 3 with PostgreSQL persistence.

The attendance report CSV starts with an official header block (reference, title, department, start, end, venue, prepared by, generated at) and RSVP/attendance counts, followed by per-guest rows: name, organisation, role, phone, email, channel, RSVP status, reason, response time, delivery status, check-in status, check-in time.
