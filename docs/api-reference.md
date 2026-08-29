# API Reference

Base URL: `/api`. Staff routes require `Authorization: Bearer <session token>`.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Service health | None |
| POST | `/auth/login` | Create staff session, body `{email,password}` | None |
| GET | `/me` | Current user | Staff |
| PUT | `/me` | Update organiser name and phone used for WhatsApp sender selection, body `{name,phone}` | Staff |
| GET | `/meetings` | List authorised meetings | Staff |
| POST | `/meetings` | Create meeting | Staff |
| GET | `/meetings/{id}` | Meeting, guests, RSVP counts | Staff |
| POST | `/meetings/{id}/guests` | Add guest | Staff |
| POST | `/meetings/{id}/guests/import` | Upload UTF-8 CSV | Staff, multipart `file` |
| POST | `/meetings/{id}/send-invites` | Create and dispatch invitations | Staff |
| PUT | `/meetings/{id}` | Edit a future meeting | Organiser or Admin |
| GET | `/rsvp/{token}` | Public meeting details | Token |
| POST | `/rsvp/{token}` | Body `{status,reason,language}` | Token |
| GET | `/rsvp/{token}/calendar.ics` | Universal calendar file for Google, Outlook, Apple Calendar, and other apps | Token |
| GET | `/meetings/{id}/report.csv` | Attendance CSV export | Staff |

Successful meeting creation returns `{id,reference}`. RSVP returns `{status:"saved",message}`. Errors use `{detail}` with HTTP 4xx status. The backend is Spring Boot 3 with PostgreSQL persistence.
