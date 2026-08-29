# Test Plan and QA Checklist

| Test | Requirement mapping | Check |
|---|---|---|
| Staff login and role restriction | FR-7.1 | Valid account succeeds, invalid account fails, unauthorised meeting is blocked |
| Meeting validation | FR-1.1 | Required title and valid end after start are enforced |
| Guest add and duplicate | FR-2.1 | Phone or email required and duplicate rejected |
| CSV import | FR-2.2, FR-2.3 | Missing headers, duplicates, valid rows, and skip reasons verified |
| Invite generation | FR-3.1, FR-3.2 | One token per guest, channel and link recorded |
| RSVP | FR-4.1, FR-4.2, FR-4.4 | All statuses work and decline requires reason |
| Localization | FR-7.2, NFR-8 | Toggle persists on dashboard and RSVP page |
| Report | FR-6.1, FR-6.2 | CSV downloads with counts and details |
| PWA | NFR-3, NFR-7, NFR-10 | 360px layout, service worker, HTTPS production |
| Provider readiness | FR-3.4, FR-5.1 | Credentials configured in staging and webhook status tested |

Automated tests are run with `mvn -f backend/pom.xml test`.
