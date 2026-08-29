package tz.go.bukobamc.meetings;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tz.go.bukobamc.meetings.model.User;
import tz.go.bukobamc.meetings.repo.UserRepository;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Covers the flows listed in docs/test-plan.md. */
@SpringBootTest
class MeetingWorkflowTest {

    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    private MockMvc mvc;
    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    private static String sha256(String value) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    }

    private Map<?, ?> body(MvcResult result) throws Exception {
        return json.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private String adminToken() throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@bukobamc.go.tz\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk()).andReturn();
        return "Bearer " + body(result).get("access_token");
    }

    private String organizerToken(String email) throws Exception {
        User u = users.findByEmail(email).orElseGet(User::new);
        u.email = email;
        u.name = "Organizer " + email;
        u.phone = "+2557000" + Math.abs(email.hashCode() % 100000);
        u.passwordHash = sha256("organizer123");
        u.role = "organizer";
        u.status = "active";
        u.active = true;
        u.emailVerified = true;
        u.phoneVerified = true;
        users.save(u);
        MvcResult result = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"organizer123\"}"))
                .andExpect(status().isOk()).andReturn();
        return "Bearer " + body(result).get("access_token");
    }

    private long createMeeting(String token) throws Exception {
        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        MvcResult result = mvc.perform(post("/api/meetings").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Finance committee\",\"purpose\":\"Quarterly review\",\"start_at\":\"" + start
                                + "\",\"end_at\":\"" + start.plusHours(2) + "\",\"location\":\"Council chamber\",\"department\":\"Finance\"}"))
                .andExpect(status().isOk()).andReturn();
        return ((Number) body(result).get("id")).longValue();
    }

    @Test
    void healthReportsService() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void loginRejectsWrongPassword() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@bukobamc.go.tz\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meetingValidationRejectsEndBeforeStart() throws Exception {
        String token = adminToken();
        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        mvc.perform(post("/api/meetings").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Bad meeting\",\"start_at\":\"" + start + "\",\"end_at\":\"" + start.minusHours(1) + "\"}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/meetings").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"start_at\":\"" + start + "\",\"end_at\":\"" + start.plusHours(1) + "\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void guestRequiresContactAndRejectsDuplicates() throws Exception {
        String token = adminToken();
        long id = createMeeting(token);
        mvc.perform(post("/api/meetings/" + id + "/guests").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"No contact\"}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/meetings/" + id + "/guests").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Asha\",\"email\":\"asha@example.com\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/meetings/" + id + "/guests").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Asha duplicate\",\"email\":\"ASHA@example.com\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void csvImportValidatesHeadersAndReportsSkippedRows() throws Exception {
        String token = adminToken();
        long id = createMeeting(token);
        MockMultipartFile missingHeaders = new MockMultipartFile("file", "guests.csv", "text/csv",
                "full_name,mobile\nAsha,0700000000\n".getBytes(StandardCharsets.UTF_8));
        mvc.perform(multipart("/api/meetings/" + id + "/guests/import").file(missingHeaders).header("Authorization", token))
                .andExpect(status().isUnprocessableEntity());

        String csv = """
                name,phone,email,role_title,organization
                Asha Mrema,+255700000001,asha@example.com,Director,BMC
                ,,,,
                Duplicate Asha,+255700000001,other@example.com,Officer,BMC
                """;
        MockMultipartFile valid = new MockMultipartFile("file", "guests.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));
        MvcResult result = mvc.perform(multipart("/api/meetings/" + id + "/guests/import").file(valid).header("Authorization", token))
                .andExpect(status().isOk()).andReturn();
        Map<?, ?> imported = body(result);
        assertThat(imported.get("added")).isEqualTo(1);
        assertThat((List<?>) imported.get("skipped")).hasSize(2);
    }

    @Test
    void xlsxImportUsesTheSameTemplateHeaders() throws Exception {
        String token = adminToken();
        long id = createMeeting(token);
        byte[] workbook;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            var sheet = wb.createSheet("guests");
            var header = sheet.createRow(0);
            String[] headers = {"name", "phone", "email", "role_title", "organization"};
            for (int i = 0; i < headers.length; i++) header.createCell(i).setCellValue(headers[i]);
            var row = sheet.createRow(1);
            String[] values = {"Juma Kato", "+255700000002", "juma@example.com", "Head", "BMC"};
            for (int i = 0; i < values.length; i++) row.createCell(i).setCellValue(values[i]);
            wb.write(out);
            workbook = out.toByteArray();
        }
        MockMultipartFile file = new MockMultipartFile("file", "guests.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", workbook);
        MvcResult result = mvc.perform(multipart("/api/meetings/" + id + "/guests/import").file(file).header("Authorization", token))
                .andExpect(status().isOk()).andReturn();
        assertThat(body(result).get("added")).isEqualTo(1);
    }

    @Test
    void inviteRsvpReminderAndReportFlow() throws Exception {
        String token = adminToken();
        long id = createMeeting(token);
        mvc.perform(post("/api/meetings/" + id + "/guests").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Neema Joseph\",\"email\":\"neema@example.com\",\"organization\":\"BMC\"}")).andExpect(status().isOk());

        MvcResult invited = mvc.perform(post("/api/meetings/" + id + "/send-invites").header("Authorization", token))
                .andExpect(status().isOk()).andReturn();
        Map<?, ?> dispatch = body(invited);
        assertThat(dispatch.get("sent")).isEqualTo(1);
        Map<?, ?> first = (Map<?, ?>) ((List<?>) dispatch.get("results")).get(0);
        String rsvpToken = String.valueOf(first.get("rsvp_link")).replaceAll(".*token=", "");

        mvc.perform(get("/api/rsvp/" + rsvpToken)).andExpect(status().isOk())
                .andExpect(jsonPath("$.guest.name").value("Neema Joseph"));
        mvc.perform(get("/api/rsvp/" + rsvpToken + "/calendar.ics")).andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("BEGIN:VCALENDAR")));

        MvcResult reminded = mvc.perform(post("/api/meetings/" + id + "/reminders").header("Authorization", token))
                .andExpect(status().isOk()).andReturn();
        assertThat(body(reminded).get("reminded")).isEqualTo(1);
        String reminderToken = String.valueOf(((Map<?, ?>) ((List<?>) body(reminded).get("results")).get(0)).get("rsvp_link"))
                .replaceAll(".*token=", "");

        mvc.perform(post("/api/rsvp/" + reminderToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"declined\",\"reason\":\"\"}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/rsvp/" + reminderToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"declined\",\"reason\":\"On approved leave\",\"language\":\"sw\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hr_notice").isNotEmpty());

        MvcResult report = mvc.perform(get("/api/meetings/" + id + "/report.csv").header("Authorization", token))
                .andExpect(status().isOk()).andReturn();
        String csv = report.getResponse().getContentAsString();
        assertThat(csv).contains("Declined,1").contains("Check-in status").contains("Neema Joseph").contains("On approved leave");
    }

    @Test
    void organizerCannotReachAnotherOrganizersMeeting() throws Exception {
        String owner = organizerToken("owner@bukobamc.go.tz");
        String other = organizerToken("other@bukobamc.go.tz");
        long id = createMeeting(owner);
        mvc.perform(get("/api/meetings/" + id).header("Authorization", other)).andExpect(status().isNotFound());
        mvc.perform(get("/api/meetings/" + id + "/report.csv").header("Authorization", other)).andExpect(status().isNotFound());
        mvc.perform(post("/api/meetings/" + id + "/send-invites").header("Authorization", other)).andExpect(status().isForbidden());
        mvc.perform(get("/api/meetings/" + id).header("Authorization", owner)).andExpect(status().isOk());
    }

    @Test
    void cancellationLocksTheMeetingAndIsAudited() throws Exception {
        String token = adminToken();
        long id = createMeeting(token);
        mvc.perform(post("/api/meetings/" + id + "/cancel").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Venue unavailable\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("cancelled"));
        mvc.perform(post("/api/meetings/" + id + "/guests").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Late guest\",\"email\":\"late@example.com\"}"))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/meetings/" + id + "/audit").header("Authorization", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.action=='cancel_meeting')]").exists());
    }

    @Test
    void auditTrailAndTrendReportAreAdminOnly() throws Exception {
        String organizer = organizerToken("trend@bukobamc.go.tz");
        mvc.perform(get("/api/audit").header("Authorization", organizer)).andExpect(status().isForbidden());
        mvc.perform(get("/api/reports/summary").header("Authorization", organizer)).andExpect(status().isForbidden());
        mvc.perform(get("/api/audit").header("Authorization", adminToken())).andExpect(status().isOk());
        mvc.perform(get("/api/reports/summary").header("Authorization", adminToken())).andExpect(status().isOk())
                .andExpect(jsonPath("$.totals").exists());
    }

    @Test
    void attendanceQrIsRefusedOutsideTheMeetingWindow() throws Exception {
        String token = adminToken();
        long id = createMeeting(token);
        mvc.perform(get("/api/meetings/" + id + "/attendance/qr").header("Authorization", token))
                .andExpect(status().isConflict());
    }

    @Test
    void staffEndpointsRequireASession() throws Exception {
        mvc.perform(get("/api/meetings").header("Authorization", "Bearer nonsense")).andExpect(status().isUnauthorized());
    }
}
