import ExcelJS from 'exceljs';
import type {
  CorrespondenceDocument,
  CorrespondenceMonthlyPeriod,
  CorrespondencePartyMetrics,
  CorrespondenceType,
} from '../types';
import type { CorrespondenceSclDelivered } from '../services/api';
import {
  buildCorrespondenceStatusBreakdown,
  computeDeliveryEfficiencyFromBreakdown,
  correspondenceCategoryLabel,
  correspondenceTypeLabel,
  formatCorrespondenceDisplayDate,
  formatCorrespondenceDocumentStatus,
  getCorrespondenceTrackingLabel,
  monthShortLabel,
} from './correspondence';

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
  fgColor: { argb: 'FF2563EB' },
};

const CLIENT_ACCENT: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFDBEAFE' },
};

const CONTRACTOR_ACCENT: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFEDE9FE' },
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

const DOCUMENT_HEADERS = [
  'Sr.',
  'Party',
  'Category',
  'Description',
  'Received',
  'Delivered',
  'Deadline',
  'Status',
  'Sender',
  'Recipient',
] as const;

export interface CorrespondenceExportInput {
  projectName: string;
  month: number;
  year: number;
  view: 'monthly' | 'cumulative';
  period: CorrespondenceMonthlyPeriod;
  documents: CorrespondenceDocument[];
  scl: CorrespondenceSclDelivered;
}

function periodLabel(month: number, year: number, view: 'monthly' | 'cumulative'): string {
  const monthName = monthShortLabel(month);
  return view === 'cumulative' ? `Jan – ${monthName} ${year}` : `${monthName} ${year}`;
}

function viewLabel(view: 'monthly' | 'cumulative'): string {
  return view === 'cumulative' ? 'Cumulative' : 'Monthly';
}

function applyBorders(row: ExcelJS.Row, colCount: number): void {
  for (let col = 1; col <= colCount; col += 1) {
    row.getCell(col).border = THIN_BORDER;
  }
}

function writeMetaBlock(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  colCount: number,
  rows: [string, string][],
): number {
  let rowIndex = startRow;
  rows.forEach(([label, value]) => {
    sheet.getCell(rowIndex, 1).value = label;
    sheet.getCell(rowIndex, 1).font = { bold: true, size: 10 };
    sheet.mergeCells(rowIndex, 2, rowIndex, colCount);
    sheet.getCell(rowIndex, 2).value = value;
    sheet.getCell(rowIndex, 2).alignment = { wrapText: true };
    rowIndex += 1;
  });
  return rowIndex;
}

function writeSectionTitle(
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
  colCount: number,
  title: string,
  fill: ExcelJS.Fill = SECTION_FILL,
): number {
  sheet.mergeCells(rowIndex, 1, rowIndex, colCount);
  const cell = sheet.getCell(rowIndex, 1);
  cell.value = title;
  cell.font = { bold: true, size: 12, color: { argb: 'FF1E3A8A' } };
  cell.fill = fill;
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(rowIndex).height = 22;
  return rowIndex + 1;
}

function writePartySummary(
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
  colCount: number,
  partyLabel: string,
  metrics: CorrespondencePartyMetrics,
  documents: CorrespondenceDocument[],
  correspondenceType: CorrespondenceType,
  month: number,
  year: number,
  accent: ExcelJS.Fill,
): number {
  let r = writeSectionTitle(sheet, rowIndex, colCount, `${partyLabel} — Delivery Performance`, accent);

  const breakdown = buildCorrespondenceStatusBreakdown(metrics, documents, correspondenceType, {
    month,
    year,
  });
  const efficiency =
    breakdown.delivered > 0
      ? computeDeliveryEfficiencyFromBreakdown(breakdown)
      : metrics.deliveryEfficiency;
  const tracking = getCorrespondenceTrackingLabel(efficiency);

  const kpiRows: [string, string | number][] = [
    ['Received', breakdown.received],
    ['Delivered', breakdown.delivered],
    ['Record', breakdown.record],
    ['On Time', breakdown.onTime],
    ['Late Deliveries', breakdown.lateDeliveries],
    ['Pending', breakdown.pending],
    ['Delivery Efficiency (%)', `${efficiency.toFixed(1)}%`],
    ['Tracking Status', tracking],
  ];

  kpiRows.forEach(([label, value]) => {
    sheet.getCell(r, 1).value = label;
    sheet.getCell(r, 1).font = { bold: true, size: 10 };
    sheet.getCell(r, 2).value = value;
    sheet.mergeCells(r, 2, r, colCount);
    r += 1;
  });

  r += 1;
  sheet.getCell(r, 1).value = 'Status Breakdown';
  sheet.getCell(r, 1).font = { bold: true, size: 10, italic: true };
  r += 1;

  const statusHeader = sheet.getRow(r);
  ['Status', 'Count', '% of Delivered'].forEach((header, idx) => {
    const cell = statusHeader.getCell(idx + 1);
    cell.value = header;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: 'center' };
    cell.border = THIN_BORDER;
  });
  r += 1;

  const delivered = breakdown.delivered || 0;
  const statusRows: [string, number][] = [
    ['On Time', breakdown.onTime],
    ['Late Deliveries', breakdown.lateDeliveries],
    ['Pending', breakdown.pending],
  ];
  statusRows.forEach(([status, count]) => {
    const row = sheet.getRow(r);
    row.getCell(1).value = status;
    row.getCell(2).value = count;
    row.getCell(3).value =
      delivered > 0 ? `${((count / delivered) * 100).toFixed(1)}%` : count > 0 ? '—' : '0%';
    applyBorders(row, 3);
    r += 1;
  });

  return r + 1;
}

function writeSclSection(
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
  colCount: number,
  scl: CorrespondenceSclDelivered,
): number {
  let r = writeSectionTitle(sheet, rowIndex, colCount, 'SCL Delivered Correspondence');

  const headerRow = sheet.getRow(r);
  ['Party', 'Received', 'Delivered', 'Record', 'Pending'].forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: 'center' };
    cell.border = THIN_BORDER;
  });
  r += 1;

  const parties: [string, typeof scl.client][] = [
    ['Client', scl.client],
    ['Contractor', scl.contractor],
    ['Other Agency', scl.other_agency],
    ['Total', scl.totals],
  ];

  parties.forEach(([label, party], idx) => {
    const row = sheet.getRow(r);
    row.getCell(1).value = label;
    row.getCell(2).value = party.received;
    row.getCell(3).value = party.delivered;
    row.getCell(4).value = party.record;
    row.getCell(5).value = party.pending;
    if (idx % 2 === 1) {
      for (let c = 1; c <= 5; c += 1) {
        row.getCell(c).fill = SECTION_FILL;
      }
    }
    applyBorders(row, 5);
    r += 1;
  });

  return r + 1;
}

function documentToRow(doc: CorrespondenceDocument): (string | number)[] {
  return [
    doc.srNo,
    correspondenceTypeLabel(doc.correspondenceType),
    correspondenceCategoryLabel(doc.correspondenceCategory),
    doc.description || '—',
    formatCorrespondenceDisplayDate(doc.receivedDate),
    formatCorrespondenceDisplayDate(doc.deliveredDate),
    formatCorrespondenceDisplayDate(doc.deadlineDate),
    formatCorrespondenceDocumentStatus(doc),
    doc.sender || '—',
    doc.recipientType || '—',
  ];
}

export async function downloadCorrespondenceExcel(
  input: CorrespondenceExportInput,
  filename: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PMC Portal';
  workbook.created = new Date();

  const summaryColCount = 6;
  const summary = workbook.addWorksheet('Summary');
  let rowIndex = 1;

  summary.mergeCells(rowIndex, 1, rowIndex, summaryColCount);
  const titleCell = summary.getCell(rowIndex, 1);
  titleCell.value = `${input.projectName} — Correspondence & Delivery Status`;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E3A8A' } };
  titleCell.fill = TITLE_FILL;
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  summary.getRow(rowIndex).height = 34;
  rowIndex += 1;

  rowIndex = writeMetaBlock(summary, rowIndex, summaryColCount, [
    ['Project', input.projectName],
    ['View', viewLabel(input.view)],
    ['Period', periodLabel(input.month, input.year, input.view)],
    ['Report Generated', new Date().toLocaleString('en-GB')],
  ]);
  rowIndex += 1;

  rowIndex = writePartySummary(
    summary,
    rowIndex,
    summaryColCount,
    'Client',
    input.period.client,
    input.documents,
    'CLIENT',
    input.month,
    input.year,
    CLIENT_ACCENT,
  );

  rowIndex = writePartySummary(
    summary,
    rowIndex,
    summaryColCount,
    'Contractor',
    input.period.contractor,
    input.documents,
    'CONTRACTOR',
    input.month,
    input.year,
    CONTRACTOR_ACCENT,
  );

  rowIndex = writeSclSection(summary, rowIndex, summaryColCount, input.scl);

  summary.getColumn(1).width = 28;
  summary.getColumn(2).width = 18;
  summary.getColumn(3).width = 16;
  summary.getColumn(4).width = 14;
  summary.getColumn(5).width = 14;
  summary.getColumn(6).width = 14;

  const docSheet = workbook.addWorksheet('Documents');
  const docColCount = DOCUMENT_HEADERS.length;
  let docRow = 1;

  docSheet.mergeCells(docRow, 1, docRow, docColCount);
  const docTitle = docSheet.getCell(docRow, 1);
  docTitle.value = `Correspondence Documents — ${periodLabel(input.month, input.year, input.view)}`;
  docTitle.font = { bold: true, size: 13, color: { argb: 'FF1E3A8A' } };
  docTitle.fill = TITLE_FILL;
  docSheet.getRow(docRow).height = 26;
  docRow += 2;

  const headerRowIndex = docRow;
  const headerRow = docSheet.getRow(docRow);
  DOCUMENT_HEADERS.forEach((header, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = header;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 22;
  docRow += 1;

  if (input.documents.length === 0) {
    docSheet.mergeCells(docRow, 1, docRow, docColCount);
    docSheet.getCell(docRow, 1).value = 'No correspondence documents for the selected period.';
    docSheet.getCell(docRow, 1).alignment = { horizontal: 'center' };
  } else {
    input.documents.forEach((doc, idx) => {
      const row = docSheet.getRow(docRow);
      const values = documentToRow(doc);
      values.forEach((value, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = value;
        cell.alignment = {
          vertical: 'top',
          horizontal: colIdx === 0 ? 'center' : 'left',
          wrapText: true,
        };
        if (idx % 2 === 1) {
          cell.fill = SECTION_FILL;
        }
      });
      applyBorders(row, docColCount);
      docRow += 1;
    });

    docSheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex + input.documents.length, column: docColCount },
    };
  }

  const docWidths = [6, 14, 12, 42, 14, 14, 14, 14, 18, 16];
  docWidths.forEach((width, idx) => {
    docSheet.getColumn(idx + 1).width = width;
  });
  docSheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

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

export function correspondenceExportFilename(
  projectName: string,
  year: number,
  month: number,
  view: 'monthly' | 'cumulative',
): string {
  const safeProject = projectName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 40);
  return `correspondence-${safeProject || 'project'}-${year}-${String(month).padStart(2, '0')}-${view}.xlsx`;
}
