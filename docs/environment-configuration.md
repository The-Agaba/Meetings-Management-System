# Environment and Configuration Guide

Copy `.env.example` to `.env` or provide equivalent environment variables to the Spring Boot process. Never commit `.env`.

`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` configure PostgreSQL. The default local database is `bmc_meetings` on port 5432 with username `postgres` and password `1234`. `PUBLIC_BASE_URL` is the HTTPS public URL used in RSVP links. `ADMIN_EMAIL` and `ADMIN_PASSWORD` seed the initial administrator. `WHATSAPP_DEFAULT_SENDER` is the temporary fallback sender, currently `0757219157`.

The current WhatsApp Cloud API sender is the Meta phone number identified by `WHATSAPP_PHONE_NUMBER_ID`. `WHATSAPP_DEFAULT_SENDER` is retained as the council fallback phone value for application data and local defaults. A normal personal number cannot be used directly by the WhatsApp Cloud API.

Email is separate from WhatsApp. The configured email sender is controlled by `SMTP_FROM` and is not the organiser's phone number. Google Calendar, Microsoft Graph, and ICS integrations are not enabled in the current baseline. Admin users have council-wide access to meetings and integration status.

For WhatsApp, create or use a Meta Business portfolio, add a WhatsApp Business account and phone number, obtain the phone number ID and a long-lived access token, register approved message templates, and set `WHATSAPP_API_URL`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_ACCESS_TOKEN`. An approved BSP may supply equivalent values.

Google Calendar and Outlook setup are future integration work and should not be configured as current production dependencies.

For SMTP, obtain a council or approved transactional mailbox, enable TLS, and set host, port, username, password, and sender. The local adapter works without credentials and reports logged delivery only.
## Registration and attendance delivery

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM` for email OTPs. Set `WHATSAPP_API_URL`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_ACCESS_TOKEN` for WhatsApp Cloud API OTPs and invitations. Keep these values in the deployment secret store, never in source control. `PUBLIC_BASE_URL` must be the HTTPS URL participants receive in their Personal Sign-In Link. `QR_ROTATION_SECONDS` defaults to 45 seconds.
