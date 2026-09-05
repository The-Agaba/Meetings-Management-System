# User Manual, English and Swahili

## Organizer registration and attendance verification

An Organizer registers with name, email, WhatsApp number, and password. The account remains `pending` until email OTP (and WhatsApp OTP when enabled) are entered once. Staff then sign in with email and password only — no login OTP. Password reset uses a one-time email code from the sign-in page. Pending registrations that are not verified within 24 hours are removed automatically.

For physical attendance, the Organizer opens Live Attendance for their own meeting and displays the rotating Session QR Code. The QR is never sent in a notification. A Participant opens their Personal Sign-In Link from WhatsApp or email, allows camera access, and scans the live Session QR Code. A successful scan records Attended with the server timestamp; reopening a used link shows that attendance is already recorded.

## Organizer and Admin

### English

1. Sign in with the council staff account (email and password). 2. Select New meeting. 3. Complete title, purpose, time, department, type, and priority. Choose **Physical meeting** and enter a venue, or choose **Virtual meeting** and enter the online meeting link. 4. Create the meeting. 5. Open Guests and add individuals or download the XLSX template from the import section, then upload CSV/XLSX. 6. Review counts and select Send invites. Virtual invitations include the online meeting link; physical invitations include the personal check-in flow. 7. To reschedule, edit the meeting and choose **Notify reschedule** so guests receive an updated notice. 8. To cancel, use **Cancel meeting** and enter a reason. Guests are notified automatically. 9. Open the meeting detail view to download attendance as CSV or PDF. Administrators can manage staff accounts, view attendance and audit logs, and download staff, attendance, audit, and full application-log files from **Administration**. Use the EN | SW switch on every page.

Past meetings remain visible for record review but are greyed out and read-only. The server rejects edits, guest changes, imports, and new invitations after the meeting end time.

### Kiswahili

1. Ingia kwa akaunti ya mtumishi wa halmashauri (barua pepe na nenosiri). 2. Chagua Mkutano mpya. 3. Jaza kichwa, madhumuni, muda, mahali, idara, aina, na kipaumbele. 4. Unda mkutano. 5. Fungua Waalikwa, pakua kiolezo cha XLSX, kisha pakia CSV/XLSX. 6. Kagua hesabu na chagua Tuma mialiko. 7. Kubadilisha ratiba, hariri mkutano na chagua **Notify reschedule**. 8. Kufuta, tumia **Cancel meeting** na andika sababu. 9. Fungua taarifa ya mkutano kupakua mahudhurio kama CSV au PDF. Wasimamizi wanaweza kusimamia akaunti, kuona mahudhurio na kumbukumbu za ukaguzi, na kupakua faili za akaunti, mahudhurio, ukaguzi na kumbukumbu kamili za mfumo kutoka **Administration**. Tumia EN | SW kwenye kila ukurasa.

Mikutano iliyopita itaendelea kuonekana kwa ajili ya kumbukumbu lakini itakuwa ya kijivu na ya kusoma tu. Seva itakataa mabadiliko baada ya muda wa kumalizika kwa mkutano.

## Participant quick reference

Open the link in WhatsApp or email. Review the meeting. Select Confirm, Decline, or Tentative. If declining, enter a short reason. A leave-related reason only displays a reminder to follow official HR leave procedures. No participant account is required.

## Future ideas

Google Calendar and Microsoft Graph OAuth, universal `.ics` links, SMS fallback, configurable reminders, historical analytics, Director dashboards, and advanced import review were part of the original plan. They are not available in the current application and should be treated as future enhancements.
