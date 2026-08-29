# Environment and Configuration Guide

Copy `.env.example` to `.env` or provide equivalent environment variables to the Spring Boot process. Never commit `.env`.

`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` configure PostgreSQL. The default local database is `bmc_meetings` on port 5432 with username `postgres` and password `1234`. `PUBLIC_BASE_URL` is the HTTPS public URL used in RSVP links. `ADMIN_EMAIL` and `ADMIN_PASSWORD` seed the initial administrator. `WHATSAPP_DEFAULT_SENDER` is the temporary fallback sender, currently `0757219157`.

The WhatsApp sender is resolved from the organiser who sends the event. The user's saved phone number is used first. If it is empty, `WHATSAPP_DEFAULT_SENDER` is used. The number must still be registered and approved as a WhatsApp Business sender by Meta or an approved BSP. A normal personal number cannot be used directly by the WhatsApp Cloud API.

Email is separate from WhatsApp. The configured email sender is `theagaba.dev@gmail.com` by default through `SMTP_FROM`, and it is not the organiser's phone number. Calendar events are also separate. Google Calendar uses the organiser's connected Google account, and Microsoft Graph uses the organiser's connected Microsoft account. The organiser phone is only the WhatsApp sender selection. Admin users have council-wide access to meetings and sender configuration.

For WhatsApp, create or use a Meta Business portfolio, add a WhatsApp Business account and phone number, obtain the phone number ID and a long-lived access token, register approved message templates, and set `WHATSAPP_API_URL`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_ACCESS_TOKEN`. An approved BSP may supply equivalent values.

For Google Calendar, create a Google Cloud project, enable Calendar API, create an OAuth consent screen, create a Web application OAuth client, configure the HTTPS callback approved by BMC ICT, and set the client ID and secret.

For Outlook, register an application in Microsoft Entra ID, configure the redirect URI, request approved Calendar permissions, and set the client ID and secret.

For SMTP, obtain a council or approved transactional mailbox, enable TLS, and set host, port, username, password, and sender. The local adapter works without credentials and reports logged delivery only.
## Registration and attendance delivery

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM` for email OTPs. Set `WHATSAPP_API_URL`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_ACCESS_TOKEN` for WhatsApp Cloud API OTPs and invitations. Keep these values in the deployment secret store, never in source control. `PUBLIC_BASE_URL` must be the HTTPS URL participants receive in their Personal Sign-In Link. `QR_ROTATION_SECONDS` defaults to 45 seconds.
