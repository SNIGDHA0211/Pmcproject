import ExcelJS from 'exceljs';
import type { DrawingClientReportData, DrawingClientReportRow } from '../types';

const TITLE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFEEF2FF' },
};

const SECTION_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' },
};

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF4F46E5' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 10,
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

const TABLE_HEADERS = [
  'Sr.',
  'Design & Drawing',
  'Contractor',
  'Rev.',
  'Submitted',
  'Consultant Comments',
  'Resubmitted',
  'Approved',
  'Status',
  'Remarks',
] as const;

function fmtDate(v: unknown): string {
  if (!v) return '—';
  const s = String(v);
  if (s === 'null' || s === 'undefined') return '—';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

function rowStatusLabel(row: DrawingClientReportRow): string {
  if (row.approvedByConsultant) return 'Approved';
  if (row.resubmissionDate) return 'Resubmitted';
  if (row.consultantCommentsDate) return 'In Review';
  return 'Submitted';
}

function viewLabel(view: DrawingClientReportData['view']): string {
  return view === 'cumulative' ? 'Cumulative' : 'Monthly';
}

function rowToExcelValues(row: DrawingClientReportRow): (string | number)[] {
  return [
    row.srNo,
    row.designAndDrawing || '—',
    row.contractorName || '—',
    row.revision ?? '—',
    fmtDate(row.submissionByContractor),
    fmtDate(row.consultantCommentsDate),
    fmtDate(row.resubmissionDate),
    fmtDate(row.approvedByConsultant),
    rowStatusLabel(row),
    row.remarks || '—',
  ];
}

function applyBorders(row: ExcelJS.Row, colCount: number): void {
  for (let col = 1; col <= colCount; col += 1) {
    row.getCell(col).border = THIN_BORDER;
  }
}

export async function downloadDrawingRegisterExcel(
  data: DrawingClientReportData,
  filename: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PMC Portal';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Drawing Register');
  const colCount = TABLE_HEADERS.length;
  let rowIndex = 1;

  sheet.mergeCells(rowIndex, 1, rowIndex, colCount);
  const titleCell = sheet.getCell(rowIndex, 1);
  titleCell.value = `${data.projectName} — Drawing Register (Client Report)`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF312E81' } };
  titleCell.fill = TITLE_FILL;
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(rowIndex).height = 30;
  rowIndex += 1;

  const metaRows: [string, string][] = [
    ['View', viewLabel(data.view)],
    ['Period', `${data.fromDate} to ${data.toDate}`],
    ['Month / Year', `${data.month} / ${data.year}`],
    ['Generated', new Date().toLocaleString('en-GB')],
  ];
  metaRows.forEach(([label, value]) => {
    sheet.getCell(rowIndex, 1).value = label;
    sheet.getCell(rowIndex, 1).font = { bold: true, size: 10 };
    sheet.mergeCells(rowIndex, 2, rowIndex, colCount);
    sheet.getCell(rowIndex, 2).value = value;
    sheet.getCell(rowIndex, 2).alignment = { wrapText: true };
    rowIndex += 1;
  });
  rowIndex += 1;

  sheet.mergeCells(rowIndex, 1, rowIndex, colCount);
  const summaryTitle = sheet.getCell(rowIndex, 1);
  summaryTitle.value = 'Summary KPIs';
  summaryTitle.font = { bold: true, size: 12 };
  summaryTitle.fill = SECTION_FILL;
  rowIndex += 1;

  const summary = data.summary;
  const summaryData: [string, string | number][] = [
    ['Submitted Drawings', summary.submittedDrawings],
    ['Approved Drawings', summary.approvedDrawings],
    ['Variance', summary.variance],
    ['Approval Rate (%)', Number(summary.approvalRate.toFixed(1))],
  ];
  summaryData.forEach(([label, value]) => {
    sheet.getCell(rowIndex, 1).value = label;
    sheet.getCell(rowIndex, 1).font = { bold: true };
    sheet.getCell(rowIndex, 2).value = value;
    rowIndex += 1;
  });
  rowIndex += 1;

  const headerRowIndex = rowIndex;
  const headerRow = sheet.getRow(rowIndex);
  TABLE_HEADERS.forEach((header, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = header;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 22;
  rowIndex += 1;

  if (data.rows.length === 0) {
    sheet.mergeCells(rowIndex, 1, rowIndex, colCount);
    sheet.getCell(rowIndex, 1).value = 'No drawing records for the selected filters.';
    sheet.getCell(rowIndex, 1).alignment = { horizontal: 'center' };
    rowIndex += 1;
  } else {
    data.rows.forEach((record, idx) => {
      const dataRow = sheet.getRow(rowIndex);
      const values = rowToExcelValues(record);
      values.forEach((value, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1);
        cell.value = value;
        cell.alignment = {
          vertical: 'top',
          horizontal: colIdx === 0 || colIdx === 3 ? 'center' : 'left',
          wrapText: true,
        };
        if (idx % 2 === 1) {
          cell.fill = SECTION_FILL;
        }
      });
      applyBorders(dataRow, colCount);
      rowIndex += 1;
    });

    sheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex + data.rows.length, column: colCount },
    };
  }

  const widths = [6, 38, 22, 8, 14, 18, 14, 14, 14, 28];
  widths.forEach((width, idx) => {
    sheet.getColumn(idx + 1).width = width;
  });

  sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safeName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: safeName,
  });
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
  link.remove();
}

export function triggerDrawingRegisterExcelBlobDownload(blob: Blob, filename: string): void {
  const safeName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: safeName,
  });
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
  link.remove();
}
