package tz.go.bukobamc.meetings.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tz.go.bukobamc.meetings.model.Guest;
import tz.go.bukobamc.meetings.model.Meeting;
import tz.go.bukobamc.meetings.repo.GuestRepository;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class GuestImportService {
    private final GuestRepository guests;

    public GuestImportService(GuestRepository guests) {
        this.guests = guests;
    }

    public Map<String, Object> importGuests(Meeting meeting, MultipartFile file) throws IOException {
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
            return importXlsx(meeting, file);
        }
        return importCsv(meeting, file);
    }

    private Map<String, Object> importCsv(Meeting meeting, MultipartFile file) throws IOException {
        int added = 0;
        int row = 1;
        List<Map<String, Object>> skipped = new ArrayList<>();
        try (CSVParser parser = CSVParser.parse(
            new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8),
            CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build())) {
            for (CSVRecord record : parser) {
                row++;
                if (saveRow(meeting, record.get("name"), record.get("phone"), record.get("email"),
                    record.get("role_title"), record.get("organization"), skipped, row)) {
                    added++;
                }
            }
        }
        return Map.of("added", added, "skipped", skipped);
    }

    private Map<String, Object> importXlsx(Meeting meeting, MultipartFile file) throws IOException {
        int added = 0;
        List<Map<String, Object>> skipped = new ArrayList<>();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) return Map.of("added", 0, "skipped", List.of(Map.of("row", 1, "reason", "empty workbook")));
            Row header = sheet.getRow(0);
            if (header == null) return Map.of("added", 0, "skipped", List.of(Map.of("row", 1, "reason", "missing header row")));
            Map<String, Integer> columns = mapHeaders(header);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                if (saveRow(meeting,
                    cell(row, columns.get("name")),
                    cell(row, columns.get("phone")),
                    cell(row, columns.get("email")),
                    cell(row, columns.get("role_title")),
                    cell(row, columns.get("organization")),
                    skipped, i + 1)) {
                    added++;
                }
            }
        }
        return Map.of("added", added, "skipped", skipped);
    }

    private Map<String, Integer> mapHeaders(Row header) {
        Map<String, Integer> columns = new HashMap<>();
        for (Cell cell : header) {
            String key = cell.getStringCellValue().trim().toLowerCase().replace(' ', '_');
            columns.put(key, cell.getColumnIndex());
        }
        return columns;
    }

    private String cell(Row row, Integer index) {
        if (index == null) return null;
        Cell cell = row.getCell(index);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) yield cell.getLocalDateTimeCellValue().toString();
                double value = cell.getNumericCellValue();
                if (value == Math.rint(value)) yield String.valueOf((long) value);
                yield String.valueOf(value);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> null;
        };
    }

    private boolean saveRow(Meeting meeting, String name, String phone, String email,
                            String roleTitle, String organization,
                            List<Map<String, Object>> skipped, int rowNumber) {
        if (name == null || name.isBlank()
            || ((phone == null || phone.isBlank()) && (email == null || email.isBlank()))) {
            skipped.add(Map.of("row", rowNumber, "reason", "name and phone or email required"));
            return false;
        }
        Guest guest = new Guest();
        guest.meeting = meeting;
        guest.name = name.trim();
        guest.phone = phone == null ? null : phone.trim();
        guest.email = email == null ? null : email.trim();
        guest.roleTitle = roleTitle;
        guest.organization = organization;
        guests.save(guest);
        return true;
    }
}
