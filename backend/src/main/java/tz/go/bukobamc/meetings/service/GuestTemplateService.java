package tz.go.bukobamc.meetings.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class GuestTemplateService {

    public byte[] buildXlsxTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Guests");
            Row title = sheet.createRow(0);
            title.setHeightInPoints(28);
            Cell titleCell = title.createCell(0);
            titleCell.setCellValue("BUKOBA MUNICIPAL COUNCIL | GUEST IMPORT");
            XSSFCellStyle titleStyle = (XSSFCellStyle) workbook.createCellStyle();
            titleStyle.setFillForegroundColor(color("087F45"));
            titleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            titleStyle.setAlignment(HorizontalAlignment.LEFT);
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setColor(IndexedColors.WHITE.getIndex());
            titleFont.setFontHeightInPoints((short) 13);
            titleStyle.setFont(titleFont);
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 4));

            Row header = sheet.createRow(1);
            String[] columns = {"name", "phone", "email", "role_title", "organization"};
            String[] headerColors = {"087F45", "D7A900", "101614", "D7A900", "418FDE"};
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                XSSFCellStyle headerStyle = (XSSFCellStyle) workbook.createCellStyle();
                headerStyle.setFont(headerFont(workbook, i == 2));
                headerStyle.setFillForegroundColor(color(headerColors[i]));
                headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                headerStyle.setAlignment(HorizontalAlignment.CENTER);
                headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
                headerStyle.setWrapText(true);
                headerStyle.setBorderBottom(BorderStyle.THIN);
                headerStyle.setBottomBorderColor(IndexedColors.WHITE.getIndex());
                cell.setCellStyle(headerStyle);
            }
            header.setHeightInPoints(24);

            Row example = sheet.createRow(2);
            example.createCell(0).setCellValue("Example Participant");
            example.createCell(1).setCellValue("07******** or +2557********");
            example.createCell(2).setCellValue("example@example.com");
            example.createCell(3).setCellValue("Department Head");
            example.createCell(4).setCellValue("Bukoba Municipal Council");
            CellStyle exampleStyle = workbook.createCellStyle();
            exampleStyle.setFillForegroundColor(color("FFF8E1"));
            exampleStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            exampleStyle.setWrapText(true);
            exampleStyle.setBorderBottom(BorderStyle.THIN);
            exampleStyle.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            for (Cell cell : example) cell.setCellStyle(exampleStyle);

            CellStyle textStyle = workbook.createCellStyle();
            textStyle.setDataFormat(workbook.createDataFormat().getFormat("@"));
            for (int row = 2; row <= 502; row++) {
                Row dataRow = sheet.getRow(row) == null ? sheet.createRow(row) : sheet.getRow(row);
                for (int column : new int[]{1, 2}) dataRow.getCell(column, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK).setCellStyle(textStyle);
            }

            DataValidationHelper validationHelper = sheet.getDataValidationHelper();
            DataValidationConstraint phoneConstraint = validationHelper.createCustomConstraint(
                "OR(AND(LEFT(B2,1)=\"0\",LEN(B2)=10,ISNUMBER(--B2)),AND(LEFT(B2,4)=\"+255\",LEN(B2)=13,ISNUMBER(--RIGHT(B2,9))))");
            DataValidation phoneValidation = validationHelper.createValidation(phoneConstraint, new CellRangeAddressList(2, 502, 1, 1));
            phoneValidation.setShowErrorBox(true);
            phoneValidation.createErrorBox("Invalid Tanzanian number", "Use 0XXXXXXXXX or +255XXXXXXXXX with exactly 9 digits after the prefix.");
            sheet.addValidationData(phoneValidation);

            Sheet instructions = workbook.createSheet("Instructions");
            Row instructionTitle = instructions.createRow(0);
            instructionTitle.setHeightInPoints(28);
            Cell instructionTitleCell = instructionTitle.createCell(0);
            instructionTitleCell.setCellValue("BUKOBA MUNICIPAL COUNCIL | IMPORT GUIDE");
            instructionTitleCell.setCellStyle(titleStyle);
            instructions.addMergedRegion(new CellRangeAddress(0, 0, 0, 1));
            instructions.setColumnWidth(0, 34 * 256);
            instructions.setColumnWidth(1, 105 * 256);
            String[][] guidance = {
                {"Guest import template", "Complete the Guests sheet, then upload the XLSX file in the meeting guest import section."},
                {"Required", "name plus at least one of phone or email."},
                {"Phone format", "Use 0XXXXXXXXX or +255XXXXXXXXX. There must be exactly 9 digits after 0 or +255."},
                {"Duplicate rule", "Email addresses and WhatsApp numbers must be unique within the same meeting."},
                {"Storage", "Valid phone numbers are saved in the system as +255XXXXXXXXX."},
                {"Example row", "The yellow row is guidance only. Replace it with real participant information before uploading."},
                {"Accepted files", "CSV or XLSX. Keep the column names on the Guests sheet unchanged."}
            };
            XSSFCellStyle instructionHeader = (XSSFCellStyle) workbook.createCellStyle();
            Font instructionFont = workbook.createFont();
            instructionFont.setBold(true);
            instructionHeader.setFont(instructionFont);
            instructionHeader.setFillForegroundColor(color("D7A900"));
            instructionHeader.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            for (int rowIndex = 0; rowIndex < guidance.length; rowIndex++) {
                Row row = instructions.createRow(rowIndex + 1);
                row.setHeightInPoints(30);
                row.createCell(0).setCellValue(guidance[rowIndex][0]);
                row.createCell(1).setCellValue(guidance[rowIndex][1]);
                row.getCell(0).setCellStyle(instructionHeader);
                row.getCell(1).getCellStyle().setWrapText(true);
                row.getCell(1).getCellStyle().setFillForegroundColor(color(rowIndex % 2 == 0 ? "E8F1FB" : "F8FAF8"));
                row.getCell(1).getCellStyle().setFillPattern(FillPatternType.SOLID_FOREGROUND);
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.setColumnWidth(i, new int[]{28, 28, 34, 24, 32}[i] * 256);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private static XSSFColor color(String hex) {
        return new XSSFColor(hexToBytes(hex), null);
    }

    private static byte[] hexToBytes(String hex) {
        return new byte[] {
            (byte) Integer.parseInt(hex.substring(0, 2), 16),
            (byte) Integer.parseInt(hex.substring(2, 4), 16),
            (byte) Integer.parseInt(hex.substring(4, 6), 16)
        };
    }

    private static Font headerFont(Workbook workbook, boolean darkHeader) {
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(darkHeader ? IndexedColors.WHITE.getIndex() : IndexedColors.WHITE.getIndex());
        return font;
    }
}
