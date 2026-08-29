# Software Requirements Specification
## Bukoba Municipal Council Meeting Management and Notification System

**Structure:** ISO/IEC/IEEE 29148 aligned, compatible with IEEE 830  
**Document status:** Working baseline for council confirmation  
**Language:** English planning document. The system itself is mandatory English and Swahili.

## Table of Contents

1. Introduction  
2. Overall Description  
3. Functional Requirements  
4. Non-Functional Requirements  
5. External Interface Requirements  
6. Data Requirements and Dictionary  
7. Use Cases  
8. Traceability and Acceptance

## 1. Introduction

### 1.1 Purpose

This SRS defines testable requirements for a PWA that replaces manual meeting coordination at Bukoba Municipal Council.

### 1.2 Scope

The product covers meeting lifecycle, guests, invitations, RSVP, calendar links, reporting, roles, audit, bilingual UI, dual Organizer verification, and physical-presence attendance. Participants use a Personal Sign-In Link without login. Leave processing remains in the official HR channel.

### 1.3 Definitions

| Term | Definition |
|---|---|
| RSVP | Participant response: Confirmed, Declined, or Tentative |
| Organizer | Staff user who manages own meetings |
| Personal Sign-In Link | Unique signed link issued to one Participant for one meeting |
| Session QR Code | Rotating QR shown only on the Organizer's live attendance screen |
| OTP | Six-digit, single-use verification code |
| Admin | User who manages council-wide configuration and reports |
| ICS | Universal calendar event file |
| BSP | Approved WhatsApp Business Solution Provider |

### 1.4 References

Council master requirements in the commissioning brief, Meta WhatsApp Business Platform documentation, Google Calendar API documentation, Microsoft Graph Calendar API documentation, Tanzania Personal Data Protection Act, and ISO/IEC/IEEE 29148 requirements engineering guidance. Final legal and provider references are to be confirmed by BMC ICT and procurement.

## 2. Overall Description

The system is a web application with a secure dashboard and public RSVP page. It interacts with WhatsApp, email, calendar providers, CSV/XLSX imports, and a relational database. Users are Admin, Organizer/Staff, and Participant. The system assumes HTTPS, valid sender credentials, correct contact data, and council-approved branding. It must support up to 50 concurrent meetings and 2,000 guests per meeting unless BMC confirms another scale.

Every page, menu, label, button, notification, RSVP page, and report must use resource-file translations and offer a persistent visible EN | SW switch. No English-only screen is acceptable.

## 3. Functional Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-1.1 | The organiser shall create a meeting with title, purpose, start/end, location, map or virtual link, department, type, and priority. | Must | 3.1 |
| FR-1.2 | The system shall save a meeting as draft and publish it. | Must | 3.1 |
| FR-1.3 | The system shall record edits, reschedules, cancellations, actor, time, and affected invitees. | Must | 3.1 |
| FR-2.1 | The organiser shall add, search, edit, and review guests per meeting. | Must | 3.2 |
| FR-2.2 | The system shall import the supplied CSV/XLSX structure and validate required fields, duplicates, phone, and email. | Must | 3.2 |
| FR-2.3 | The system shall show added and skipped counts with row-level reasons before commit. | Must | 3.2 |
| FR-3.1 | Send Invites shall create one invitation per guest and select WhatsApp or email according to available contact. | Must | 3.3 |
| FR-3.2 | Messages shall include title, purpose, date/time, place or link, RSVP link, and calendar link. | Must | 3.3 |
| FR-3.3 | The system shall send configurable reminders to non-responders. | Should | 3.3 |
| FR-3.4 | The system shall record provider delivery statuses where exposed. | Must | 3.3 |
| FR-4.1 | A participant shall submit Confirmed, Declined, or Tentative without login. | Must | 3.4 |
| FR-4.2 | Registration shall create a pending Organizer and require separate email and WhatsApp OTP verification before activation. | Must | 3.4 |
| FR-4.3 | Each OTP shall be hashed, expire after 10 minutes, be single-use, and enforce resend limits. Pending registrations expire after 24 hours. | Must | 3.4 |
| FR-5.1 | The Organizer shall see a live Session QR Code only for their own meeting; it shall rotate and expire around the scheduled window. | Must | 3.5 |
| FR-5.2 | Each invitation shall include a Personal Sign-In Link. The participant page shall request camera access and submit the scanned Session QR Code with that link token. | Must | 3.5 |
| FR-5.3 | The server shall validate participant, meeting, QR expiry, and one-time use before recording server time as Attended. | Must | 3.5 |
| FR-4.2 | Decline shall require a short reason. | Must | 3.4 |
| FR-4.3 | Leave-related absence text shall show an HR procedure notice and shall not create a leave workflow. | Must | 3.4 |
| FR-4.4 | Responses shall update dashboard counts and send confirmation. | Must | 3.4 |
| FR-5.1 | The system shall create or update organiser events through Google Calendar and Microsoft Graph adapters. | Should | 3.5 |
| FR-5.2 | The system shall provide an ICS link for every invitation. | Must | 3.5 |
| FR-5.3 | The system shall warn about organiser calendar conflicts. | Should | 3.5 |
| FR-6.1 | The system shall generate per-meeting RSVP and attendance reports with official header fields. | Must | 3.6 |
| FR-6.2 | Reports shall include visual breakdown and detailed export. | Must | 3.6 |
| FR-6.3 | Admin shall generate historical trend reports. | Should | 3.6 |
| FR-7.1 | Admin and Organizer access shall be role-restricted and audited. | Must | 3.7 |
| FR-7.2 | The language choice shall persist per user or session and apply to UI, messages, RSVP, and reports. | Must | Section 4 |

## 4. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | At least 95 percent of normal RSVP requests shall respond within 2 seconds under the agreed baseline load. |
| NFR-2 | Invitation dispatch shall enqueue or acknowledge within 5 seconds for 2,000 guests, with provider delivery tracked asynchronously in production. |
| NFR-3 | RSVP pages shall remain usable at 360px width and on slow mobile connections. |
| NFR-4 | Staff endpoints shall require authenticated sessions, least privilege, validation, and audit logging. |
| NFR-5 | Sensitive contact data shall use encrypted transport and encrypted storage or encrypted database volumes. |
| NFR-6 | Backups shall be scheduled daily with tested restoration at least monthly. |
| NFR-7 | The service shell shall cache for offline viewing, and connectivity-dependent actions shall show a visible offline state. |
| NFR-8 | All copy shall come from English and Swahili resource files, with no hardcoded user-facing strings in markup. |
| NFR-9 | UI shall use semantic labels, keyboard access, sufficient contrast, and responsive layout. |
| NFR-10 | Production shall use HTTPS and secure secret management. |

## 5. External Interface Requirements

WhatsApp uses the Meta Cloud API or approved Tanzania-active BSP, with webhook delivery status, template approval, rate limiting, and access token in environment configuration. Google Calendar uses OAuth 2.0 and Calendar API event create/update/delete. Microsoft Graph uses Entra application registration and delegated or application permissions as approved. Email uses SMTP with TLS. CSV import uses UTF-8 CSV with the template headers; XLSX is accepted by the same importer in the production adapter.

## 6. Data Requirements and Dictionary

| Entity | Key fields | Relationships |
|---|---|---|
| User | id, email, password_hash, role, name, phone, status, email_verified, phone_verified | creates meetings, audit entries |
| OTPVerification | user_id, channel, code_hash, expires_at, attempt_count, resend_count, used | dual registration verification |
| Department | id, name_en, name_sw | referenced by meetings |
| Meeting | id, reference, title, purpose, times, place, type, priority, status, created_by | has guests and invitations |
| Guest | id, meeting_id, name, phone, email, role_title, organisation | belongs to meeting |
| Invitation | id, meeting_id, guest_id, token_hash, delivery_status, sent_at | one per guest per meeting |
| RSVPResponse | id, invitation_id, status, reason, language, responded_at | zero or one per invitation |
| QRSession | meeting_id, session_token_hash, issued_at, expires_at | rotating Session QR Code |
| AttendanceRecord | meeting_id, participant_id, personal_token_hash, signed_in_at, used | physical-presence attendance |
| AuditLogEntry | id, user_id, action, entity, entity_id, detail, created_at | immutable operational trail |

## 7. Use Cases

| Use case | Actor and goal | Main flow |
|---|---|---|
| UC-01 Create meeting | Organizer wants to publish a meeting | Authenticate, enter fields, validate times, save draft or publish, create audit record |
| UC-02 RSVP via WhatsApp link | Participant wants to answer without an account | Open signed link, view meeting, select response, enter reason if declining, submit, receive confirmation |
| UC-03 Import CSV guest list | Organizer wants to load many guests | Download template, upload file, validate rows, review skips, commit valid rows |
| UC-04 Generate attendance report | Admin wants official record | Select meeting, view aggregate counts, export detailed report, retain generation metadata |

## 8. Traceability and Acceptance

Acceptance requires passing the test plan in `docs/test-plan.md`, including meeting creation, CSV import, token validation, RSVP, language persistence, role restriction, offline shell, report export, and provider configuration checks.
