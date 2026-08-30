package tz.go.bukobamc.meetings.api;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tz.go.bukobamc.meetings.service.GuestTemplateService;

import java.io.IOException;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {
    private final GuestTemplateService templates;

    public TemplateController(GuestTemplateService templates) {
        this.templates = templates;
    }

    @GetMapping("/guest-import.xlsx")
    public ResponseEntity<byte[]> guestImportTemplate() throws IOException {
        byte[] body = templates.buildXlsxTemplate();
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=guest-list-template.xlsx")
            .contentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(body);
    }
}
