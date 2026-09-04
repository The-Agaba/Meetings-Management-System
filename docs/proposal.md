# Bukoba Municipal Council
## Meeting Management and Notification System

**Executive Summary and Project Proposal**  
Prepared for: Office of the Municipal Director  
Classification: Official / Internal use  
Date: 23 August 2026  

## Table of Contents

1. Executive Summary  
2. Background and Case for Change  
3. Objectives and Expected Outcomes  
4. Proposed Solution and Scope  
5. Implementation Methodology  
6. System Overview  
7. Benefits to the Council  
8. Implementation Plan and Timeline  
9. Team and Roles  
10. Indicative Budget  
11. Risk Register  
12. Open Questions and Decisions Required  
13. Appendices

## 1. Executive Summary

Bukoba Municipal Council currently coordinates many meetings through phone calls, printed notices, and word of mouth. This creates avoidable missed attendance, inconsistent participant records, and no reliable RSVP trail for management review. The proposed Meeting Management and Notification System will provide one auditable workflow for creating meetings, importing guests, dispatching invitations through WhatsApp and email, collecting Confirm, Decline, or Tentative responses, synchronising the organiser's calendar, and producing official attendance reports.

The system is delivered as a mobile-first Progressive Web App. Organisers and administrators use a secure dashboard. Participants use a low-bandwidth link-based RSVP page without creating an account. WhatsApp is optional, with email as a secondary channel. The current UI supports English and Kiswahili across the main staff and participant workflows.

Expected impact includes improved attendance visibility, faster communication, better records management, fewer manual follow-ups, and a defensible audit trail. The recommended delivery is a 12-week Phase 1 followed by a controlled pilot and handover. A rough order-of-magnitude Phase 1 budget is **TZS 45,000,000 to TZS 85,000,000**, excluding third-party messaging charges, hosting choice, taxes, and official branding production. Final costs require confirmation of scale, hosting, procurement rules, and integration credentials.

## 2. Background and Case for Change

Bukoba Municipal Council is the administrative and commercial capital of Kagera Region. The Municipal Director's office and department heads coordinate internal and stakeholder meetings across changing schedules and participant groups. Manual coordination does not provide a single source of truth for invitations, responses, rescheduling, delivery outcomes, or historical attendance.

The system addresses this gap with a conventional relational application and standard integrations. It is intentionally simple: a single organiser dashboard, a frictionless public RSVP page, and a reporting workflow suitable for council records.

## 3. Objectives and Expected Outcomes

Objectives are to digitise meeting creation, provide traceable invitations and responses, reduce manual coordination, support management reporting, and protect participant contact data. The outcome targets are a complete invitation trail for every guest, response visibility in near real time, consistent official reports, and a bilingual user experience across the entire system.

## 4. Proposed Solution and Scope

### In scope

Meeting creation, draft and publication, reschedule and cancellation notices, manual and CSV/XLSX guest management, WhatsApp and email notifications, tokenised RSVP, leave-procedure notice for relevant decline reasons, live RSVP counts, rotating QR attendance, CSV and PDF reports, admin CSV and application-log exports, RBAC, audit logging, bilingual resources, PWA installation, offline shell status, and deployment documentation.

### Phased delivery

The current baseline delivers core meeting management, guest import, notification adapters, RSVP, QR attendance, administration, exports, and reporting. Future phases can add calendar integrations, advanced analytics, SMS fallback, Director oversight, and richer governance after council decisions.

### Out of scope

The system does not process leave applications, replace official HR channels, or create accounts for participants. It does not assume a specific hosting provider or official emblem file. Those inputs are controlled deployment decisions.

## 5. Implementation Methodology

Delivery will use short, reviewable increments: discovery and confirmation, foundation, core workflow, integrations, pilot, and handover. Council representatives will validate requirements and bilingual copy at the end of each increment. Security and acceptance checks will be performed before production access.

## 6. System Overview

The default architecture is a Spring Boot REST backend, responsive PWA frontend, Spring Data JPA with PostgreSQL, signed expiring RSVP tokens, staff session tokens, and provider adapters for Meta WhatsApp Cloud API and SMTP. Production uses PostgreSQL and HTTPS.

The header of every application page and official report must show both the National Coat of Arms of Tanzania and the Bukoba Municipal Council logo. The repository therefore exposes an official asset location, but authorised high-resolution files must be supplied by the relevant government offices before go-live. No emblem is to be redrawn or approximated.

## 7. Benefits to the Council

The council will gain an auditable record of meeting lifecycle decisions, one-click guest communication, accessible response capture, improved calendar awareness, official report consistency, and management-level visibility into participation trends. The PWA approach avoids participant installation and supports constrained connectivity through lightweight pages and cached application shell content.

## 8. Implementation Plan and Timeline

| Week | Activity | Acceptance evidence |
|---|---|---|
| 1 | Confirm hosting, scale, branding, roles, and check-in decision | Signed decision log |
| 2 | Confirm bilingual glossary, security controls, and data retention | Approved glossary and control list |
| 3-4 | Core database, authentication, meeting and guest modules | Demonstrable dashboard |
| 5-6 | CSV import, RSVP, notification adapter, audit log | Test records and import summary |
| 7 | Calendar and ICS integration | Calendar acceptance test |
| 8 | Reports, PWA, accessibility and offline behaviour | QA checklist |
| 9-10 | Pilot with selected departments | Pilot report |
| 11 | Corrections, training, migration and operations setup | Go-live readiness review |
| 12 | Production launch and handover | Signed handover |

## 9. Team and Roles

| Role | Responsibility |
|---|---|
| Municipal Director sponsor | Direction, approvals, escalation |
| Council ICT lead | Hosting, accounts, security, operational ownership |
| Product owner | Prioritisation and acceptance |
| Solution lead | Architecture and integration design |
| Backend/frontend developers | Implementation and tests |
| QA and accessibility lead | Verification and release evidence |
| Department focal persons | Pilot use, data quality, bilingual review |

## 10. Indicative Budget

| Cost item | Indicative range, TZS |
|---|---:|
| Discovery and detailed design | 5,000,000 - 10,000,000 |
| Application build and testing | 25,000,000 - 45,000,000 |
| Integration configuration | 5,000,000 - 12,000,000 |
| Training, deployment and handover | 5,000,000 - 10,000,000 |
| Contingency | 5,000,000 - 8,000,000 |
| **Phase 1 total, indicative** | **45,000,000 - 85,000,000** |

This is a rough order-of-magnitude estimate only. WhatsApp conversation charges, SMTP, hosting, domain, certificates, taxes, procurement overhead, official asset preparation, and future SMS charges require separate confirmation.

## 11. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R-01 | WhatsApp credentials or approved BSP delayed | Medium | High | Configure provider adapter early and pilot with approved sender | ICT |
| R-02 | Connectivity affects participant access | High | Medium | Lightweight RSVP, retries, email fallback, SMS in Phase 2 | Product owner |
| R-03 | Incorrect guest contact data | Medium | High | CSV validation, duplicate checks, confirmation before dispatch | Department focal persons |
| R-04 | Hosting/data residency decision delayed | Medium | High | Maintain documented deployment options and decision gate in Week 1 | ICT |
| R-05 | Bilingual copy incomplete | Medium | High | Resource-file review and language acceptance checklist | Product owner |
| R-06 | Unauthorised access to contact data | Low | High | RBAC, encryption, secrets management, audit logs, backups | ICT |
| R-07 | Official logo assets unavailable | Medium | Medium | Obtain authorised files before go-live; do not redraw | Communications office |

## 12. Open Questions and Decisions Required

1. Will ICT administer the system, or will departments have focal persons?
2. Will hosting use government infrastructure, a Tanzania-based provider, or cloud hosting?
3. Which official branding files and usage rules must be applied?
4. What meetings-per-month and guests-per-meeting volumes should size infrastructure and WhatsApp budget?
5. Is a Municipal Director or Executive read-only role required?

## Future ideas

These items appeared in the original planning material but are not available in the current application. They are retained as a backlog rather than promised features:

- Google Calendar and Microsoft Graph OAuth integrations.
- Universal ICS links and calendar conflict warnings.
- Configurable reminders for non-responders and SMS fallback.
- Historical trends, department summaries, and Director read-only dashboards.
- Advanced duplicate detection, import preview, and richer field validation.
- Fully bilingual notification templates and generated reports.
- Queue-based delivery and complete provider webhook orchestration.

## 13. Appendices

### Appendix A: Data flow description

1. Organiser creates and validates a meeting. 2. Guest records are added manually or imported from the template. 3. The system creates one invitation and signed RSVP token per guest. 4. Notification adapters dispatch WhatsApp first and email where configured, recording status. 5. Participant opens the lightweight RSVP page, selects a response, and optionally gives a reason. 6. The backend validates and stores the response and sends a confirmation. 7. Calendar adapters create or update the organiser event and the universal ICS link remains available. 8. Reporting aggregates invitations and responses, applying official header and bilingual report labels.

### Appendix B: Sample attendance report layout

The report contains council letterhead with both official emblems, meeting reference, title, date, venue, prepared-by field, generation date, KPI cards for invited, confirmed, declined, tentative, no response, and actual check-in where enabled. It includes an RSVP breakdown bar or pie chart, decline reason categories, department summary, and a detailed table with participant, organisation, contact method, response, response time, delivery status, and check-in status.
