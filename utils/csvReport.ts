import { formatIndianCurrencyCompact, toLocalDateIso } from './format';

export const REPORT_NA = 'N/A';
export const SECTION_BANNER_WIDTH = 50;
const SECTION_BANNER = '='.repeat(SECTION_BANNER_WIDTH);

/** Management-report date format: DD-MMM-YYYY (plain text for CSV/Excel). */
export function formatReportDate(value: unknown): string {
  if (value == null || value === '') return REPORT_NA;

  const str = String(value).trim();
  if (!str) return REPORT_NA;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  let parsed: Date;
  if (isoMatch) {
    parsed = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  } else {
    parsed = new Date(str);
  }

  if (Number.isNaN(parsed.getTime())) return REPORT_NA;

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.toLocaleString('en-GB', { month: 'short' });
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatReportTodayDate(date = new Date()): string {
  return formatReportDate(toLocalDateIso(date));
}

/** YYYY-MM, YYYY-MM-DD, or ISO month labels → Jun-2026 */
export function formatReportMonth(value: unknown): string {
  if (value == null || value === '') return REPORT_NA;

  const str = String(value).trim();
  if (!str) return REPORT_NA;

  const yearMonth = /^(\d{4})-(\d{2})$/.exec(str);
  if (yearMonth) {
    const parsed = new Date(Number(yearMonth[1]), Number(yearMonth[2]) - 1, 1);
    if (!Number.isNaN(parsed.getTime())) {
      const mon = parsed.toLocaleString('en-GB', { month: 'short' });
      return `${mon}-${yearMonth[1]}`;
    }
  }

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (isoDate) {
    const parsed = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    if (!Number.isNaN(parsed.getTime())) {
      const mon = parsed.toLocaleString('en-GB', { month: 'short' });
      return `${mon}-${isoDate[1]}`;
    }
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const mon = parsed.toLocaleString('en-GB', { month: 'short' });
    return `${mon}-${parsed.getFullYear()}`;
  }

  return str;
}

export function formatReportCell(value: unknown): string {
  if (value == null) return REPORT_NA;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? REPORT_NA : trimmed;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : REPORT_NA;
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return REPORT_NA;
  return String(value);
}

export function formatReportDays(value: unknown): string {
  if (value == null || value === '') return REPORT_NA;
  const n = Number(value);
  if (!Number.isFinite(n)) return REPORT_NA;
  return String(Math.round(n));
}

export function formatReportPercent(value: unknown, decimals = 1): string {
  if (value == null || value === '') return REPORT_NA;
  const n = Number(value);
  if (!Number.isFinite(n)) return REPORT_NA;
  return `${n.toFixed(decimals)}%`;
}

export function formatReportIndex(value: unknown, decimals = 2): string {
  if (value == null || value === '') return REPORT_NA;
  const n = Number(value);
  if (!Number.isFinite(n)) return REPORT_NA;
  return n.toFixed(decimals);
}

/** Compact Indian currency for management reports (₹99.90 Cr, ₹1.10 L, etc.). */
export function formatReportCurrency(value: unknown): string {
  if (value == null || value === '') return REPORT_NA;
  const n = Number(value);
  if (!Number.isFinite(n)) return REPORT_NA;
  return formatIndianCurrencyCompact(n);
}

export function escapeCsvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(',');
}

export type ReportSheetId =
  | 'summary'
  | 'projectDates'
  | 'contractValues'
  | 'invoicing'
  | 'financial'
  | 'healthSafety'
  | 'quality'
  | 'drawings'
  | 'correspondence'
  | 'bottleneck'
  | 'machinery'
  | 'equipment';

export const REPORT_SHEET_NAMES: Record<ReportSheetId, string> = {
  summary: 'Project Summary',
  projectDates: 'Project Dates',
  contractValues: 'Contract Values',
  invoicing: 'Invoicing Information',
  financial: 'Financial Performance',
  healthSafety: 'Health & Safety',
  quality: 'Quality Status',
  drawings: 'Drawings Summary',
  correspondence: 'Correspondence & Delivery',
  bottleneck: 'Bottleneck Register',
  machinery: 'Site Machinery',
  equipment: 'Project Equipment',
};

export type CsvReportSection = {
  title: string;
  headers: string[];
  rows: unknown[][];
  sheet?: ReportSheetId;
};

function visibleCellLength(value: unknown): number {
  return value == null ? 0 : String(value).length;
}

function padSectionForExcel(section: CsvReportSection): CsvReportSection {
  if (section.headers.length === 0) return section;

  const colCount = section.headers.length;
  const widths = Array.from({ length: colCount }, (_, colIdx) => {
    let max = visibleCellLength(section.headers[colIdx]);
    for (const row of section.rows) {
      max = Math.max(max, visibleCellLength(row[colIdx]));
    }
    return Math.max(max, 12);
  });

  const padCell = (value: unknown, colIdx: number): string => {
    const text = value == null ? '' : String(value);
    const target = widths[colIdx] ?? text.length;
    if (text.length >= target) return text;
    return `${text}${' '.repeat(target - text.length)}`;
  };

  return {
    ...section,
    headers: section.headers.map((header, colIdx) => padCell(header, colIdx)),
    rows: section.rows.map((row) =>
      Array.from({ length: colCount }, (_, colIdx) => padCell(row[colIdx] ?? '', colIdx))
    ),
  };
}

export function renderCsvSection(section: CsvReportSection): string[] {
  const padded = padSectionForExcel(section);
  const lines: string[] = ['', SECTION_BANNER, padded.title, SECTION_BANNER, ''];

  if (padded.headers.length > 0) {
    lines.push(csvRow(padded.headers));
  }

  if (padded.rows.length === 0) {
    const emptyRow =
      padded.headers.length > 0
        ? [REPORT_NA, ...padded.headers.slice(1).map(() => REPORT_NA)]
        : [REPORT_NA];
    if (padded.headers.length > 0) emptyRow[0] = 'No data available';
    lines.push(csvRow(emptyRow));
  } else {
    padded.rows.forEach((row) => lines.push(csvRow(row)));
  }

  lines.push('');
  return lines;
}

/** UTF-8 BOM + Excel separator hint + Windows line endings. */
export function composeCsvDocument(sections: CsvReportSection[]): string {
  const lines = sections.flatMap(renderCsvSection);
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return `\uFEFFsep=,\r\n${lines.join('\r\n')}`;
}

export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildMetricSection(
  title: string,
  sheet: ReportSheetId,
  metrics: Array<{ label: string; value: unknown; percent?: unknown }>
): CsvReportSection {
  return {
    title,
    sheet,
    headers: ['Metric', 'Value', 'Percentage'],
    rows: metrics.map(({ label, value, percent }) => [
      label,
      typeof value === 'number' ? formatReportCurrency(value) : formatReportCell(value),
      percent != null && percent !== '' ? formatReportPercent(percent) : REPORT_NA,
    ]),
  };
}

export function monthYearLabel(month?: number, year?: number): string {
  if (month == null || year == null || !Number.isFinite(month) || !Number.isFinite(year)) {
    return REPORT_NA;
  }
  return formatReportMonth(`${year}-${String(month).padStart(2, '0')}`);
}
