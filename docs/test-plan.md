# Test Plan and QA Checklist

| Test | Requirement mapping | Check |
|---|---|---|
| Staff login and role restriction | FR-7.1 | Valid password login succeeds, invalid login fails, admin routes reject non-admin users |
| Meeting validation | FR-1.1 | Required title and valid end after start are enforced |
| Guest add and import | FR-2.1, FR-2.2, FR-2.3 | Manual guest entry, CSV/XLSX import, valid rows, and skipped-row response verified |
| Invite generation | FR-3.1, FR-3.2 | One token per guest, channel and link recorded |
| RSVP | FR-4.1, FR-4.2, FR-4.4 | All statuses work and decline requires reason |
| Localization | FR-7.2, NFR-8 | English/Kiswahili toggle is available on staff, RSVP, registration, and attendance pages |
| Meeting reports | FR-6.1, FR-6.2 | Meeting CSV/PDF downloads contain the expected meeting and attendance data |
| Admin exports | FR-6.2 | Staff, attendance, audit, and complete application log downloads succeed for an admin |
| PWA | NFR-3, NFR-7, NFR-10 | 360px layout, service worker, HTTPS production |
| Provider readiness | FR-3.3 | SMTP and optional Meta WhatsApp credentials configured in staging and test delivery checked |

## Future-scope checks

Google Calendar, Microsoft Graph, ICS links, SMS fallback, configurable reminders, historical analytics, and advanced import review are not release gates for the current baseline. They remain future ideas documented in the SRS and proposal.

Automated tests are run with `mvn -f backend/pom.xml test`.
