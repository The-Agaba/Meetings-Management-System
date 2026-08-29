# Bukoba Municipal Council Meeting Management and Notification System

Production-oriented bilingual PWA for meeting creation, guest management, notifications, RSVP capture, calendar links, and reporting. The backend is Spring Boot with PostgreSQL.

## Quick start

Prerequisites: Java 21, Maven, PostgreSQL 15+, and a modern browser.

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
mvn -f backend\pom.xml spring-boot:run
```

Open `http://127.0.0.1:8000`. PostgreSQL is required and the administrator is seeded from the environment.

Organizer registration is available at `/register.html`. Configure SMTP and WhatsApp Cloud API values in `.env` before testing OTP and invitation delivery. The Organizer opens Live Attendance from a meeting detail, while Participants use the Personal Sign-In Link included in their invitation.

Run tests:

```powershell
mvn -f backend\pom.xml test
```

The frontend is served as static files by any HTTPS web server. The React production build is generated in `frontend/dist`. During development, Vite proxies `/api` to the Spring Boot backend.

## Repository map

- `backend`: Spring Boot API, PostgreSQL persistence, validation, notification and calendar adapters
- `frontend`: React/Vite installable PWA shell, dashboard, RSVP page, and localization resources
- `docs`: proposal, SRS, deployment, API, schema, manuals, QA and handover notes
- `templates`: CSV and XLSX guest import templates plus message templates
- `frontend/assets/official`: official Coat of Arms and BMC logo supplied by authorised offices

## Important production inputs

The repository contains no invented official emblems. Place authorised high-resolution files at `frontend/assets/official/tanzania-coat-of-arms.svg` and `frontend/assets/official/bukoba-municipal-council-logo.svg`. See `docs/environment-configuration.md` and `docs/deployment-guide.md`.

## Default technology decision

Spring Boot 3, Java 21, Spring Data JPA, PostgreSQL, signed participant tokens, staff session tokens, and resource-file driven English/Swahili localization. Third-party providers are configured behind integration boundaries and fall back to recorded delivery in local mode.
