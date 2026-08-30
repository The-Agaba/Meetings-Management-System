package tz.go.bukobamc.meetings.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class GuestTemplateService {

    public byte[] buildXlsxTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Guests");
            Row header = sheet.createRow(0);
            String[] columns = {"name", "phone", "email", "role_title", "organization"};
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }
            Row example = sheet.createRow(1);
            example.createCell(0).setCellValue("Example Participant");
            example.createCell(1).setCellValue("0757219157");
            example.createCell(2).setCellValue("example@example.com");
            example.createCell(3).setCellValue("Department Head");
            example.createCell(4).setCellValue("Bukoba Municipal Council");
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
