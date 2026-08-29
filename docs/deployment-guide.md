# Deployment Guide

1. Provision an approved Tanzania-hosted, government, or cloud Linux server and DNS name.
2. Install Java 21, Maven, PostgreSQL, and a reverse proxy such as Nginx. Alternatively run `docker compose up -d postgres` to create the `bmc_meetings` database with the current local credentials.
3. Copy the repository and build with `mvn -f backend/pom.xml clean package`.
4. Create `.env` with the production PostgreSQL URL, HTTPS public URL, administrator values, and provider credentials.
5. Place authorised Coat of Arms and BMC logo files in `frontend/assets/official` and rebuild the React frontend.
6. Run the service with a process manager, for example `java -jar backend/target/bmc-meetings-1.0.0.jar`.
7. Configure Nginx to proxy HTTPS traffic to port 8000 and obtain a trusted certificate. PWAs require HTTPS except localhost.
8. Restrict database access, schedule daily encrypted backups, and test restoration.
9. Test login, meeting creation, import, invite generation, RSVP, report download, EN/SW toggle, mobile display, and offline shell.
10. Run the pilot with selected departments and retain the signed go-live checklist.

## Installation checks

Android: open the HTTPS site in Chrome, choose Add to Home screen, and launch the standalone icon. iOS: open in Safari, Share, Add to Home Screen. Confirm the app shell loads after a temporary network loss.
