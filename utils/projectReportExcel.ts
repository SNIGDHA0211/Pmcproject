import ExcelJS from 'exceljs';
import type { CsvReportSection, ReportSheetId } from './csvReport';
import { REPORT_NA, REPORT_SHEET_NAMES } from './csvReport';

const TITLE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE8EEF4' },
};

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' },
};

function cellText(value: unknown): string {
  if (value == null || value === '') return REPORT_NA;
  return String(value);
}

function columnWidthForValues(values: string[]): number {
  const maxLen = values.reduce((max, value) => Math.max(max, value.length), 0);
  return Math.min(Math.max(maxLen + 2, 10), 48);
}

async function appendSectionToSheet(
  worksheet: ExcelJS.Worksheet,
  section: CsvReportSection,
  startRow: number
): Promise<number> {
  let rowIndex = startRow;

  const titleRow = worksheet.getRow(rowIndex);
  titleRow.getCell(1).value = section.title;
  titleRow.getCell(1).font = { bold: true, size: 12 };
  titleRow.getCell(1).fill = TITLE_FILL;
  if (section.headers.length > 0) {
    worksheet.mergeCells(rowIndex, 1, rowIndex, section.headers.length);
  }
  rowIndex += 1;

  if (section.headers.length > 0) {
    const headerRow = worksheet.getRow(rowIndex);
    section.headers.forEach((header, colIdx) => {
      const cell = headerRow.getCell(colIdx + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = HEADER_FILL;
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    });
    rowIndex += 1;
  }

  if (section.rows.length === 0) {
    const emptyRow = worksheet.getRow(rowIndex);
    emptyRow.getCell(1).value = 'No data available';
    rowIndex += 1;
  } else {
    section.rows.forEach((dataRow) => {
      const row = worksheet.getRow(rowIndex);
      dataRow.forEach((value, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = cellText(value);
        cell.alignment = { vertical: 'top', wrapText: true };
      });
      rowIndex += 1;
    });
  }

  rowIndex += 1;
  return rowIndex;
}

function applyColumnWidths(worksheet: ExcelJS.Worksheet, maxCol: number): void {
  for (let col = 1; col <= maxCol; col += 1) {
    const values: string[] = [];
    worksheet.eachRow((row) => {
      const cell = row.getCell(col);
      if (cell.value != null) values.push(String(cell.value));
    });
    worksheet.getColumn(col).width = columnWidthForValues(values);
  }
}

export async function buildProjectReportWorkbook(
  sections: CsvReportSection[]
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PMC Portal';
  workbook.created = new Date();

  const sheetOrder: ReportSheetId[] = [
    'summary',
    'projectDates',
    'contractValues',
    'invoicing',
    'financial',
    'healthSafety',
    'quality',
    'drawings',
    'correspondence',
    'bottleneck',
    'machinery',
    'equipment',
  ];

  for (const sheetId of sheetOrder) {
    const sheetSections = sections.filter((section) => section.sheet === sheetId);
    if (sheetSections.length === 0) continue;

    const worksheet = workbook.addWorksheet(REPORT_SHEET_NAMES[sheetId], {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    let rowIndex = 1;
    let maxCol = 1;

    for (const section of sheetSections) {
      maxCol = Math.max(maxCol, section.headers.length);
      rowIndex = await appendSectionToSheet(worksheet, section, rowIndex);
    }

    applyColumnWidths(worksheet, maxCol);

    const firstHeaderSection = sheetSections.find((s) => s.headers.length > 0);
    if (firstHeaderSection) {
      const headerRowNumber =
        sheetSections.indexOf(firstHeaderSection) === 0
          ? 2
          : sheetSections
              .slice(0, sheetSections.indexOf(firstHeaderSection))
              .reduce((acc, s) => acc + (s.headers.length > 0 ? s.rows.length + 3 : 2), 1) + 1;
      worksheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];
    }
  }

  return workbook;
}

export async function buildSingleSheetWorkbook(
  sheetName: string,
  sections: CsvReportSection[]
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PMC Portal';
  workbook.created = new Date();

  const safeSheetName = sheetName.replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 31) || 'Report';
  const worksheet = workbook.addWorksheet(safeSheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  let rowIndex = 1;
  let maxCol = 1;

  for (const section of sections) {
    maxCol = Math.max(maxCol, section.headers.length);
    rowIndex = await appendSectionToSheet(worksheet, section, rowIndex);
  }

  applyColumnWidths(worksheet, maxCol);
  return workbook;
}

export async function downloadSectionsExcel(
  sections: CsvReportSection[],
  filename: string,
  sheetName = 'Report'
): Promise<void> {
  const workbook = await buildSingleSheetWorkbook(sheetName, sections);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadProjectReportExcel(
  sections: CsvReportSection[],
  filename: string
): Promise<void> {
  const workbook = await buildProjectReportWorkbook(sections);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
