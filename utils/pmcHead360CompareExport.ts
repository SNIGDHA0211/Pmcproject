import ExcelJS from 'exceljs';
import type { ProjectVitalsCard } from './projectVitals';
import { PORTFOLIO_SCORE_FORMULAS } from './projectVitals';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

function vitalValue(card: ProjectVitalsCard, key: ProjectVitalsCard['vitals'][number]['key']) {
  const vital = card.vitals.find((item) => item.key === key);
  return {
    percent: vital?.percent ?? null,
    note: vital?.note ?? '',
  };
}

function formatPercent(value: number | null): string {
  return value == null ? '—' : `${value}%`;
}

export async function downloadPmcHead360CompareExcel(
  cards: ProjectVitalsCard[],
  filename: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PMC Head 360° Overview';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Project Comparison', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const headers = [
    'Project',
    'Location',
    'Team Lead / PM',
    'Overall Score',
    'Health Status',
    'Schedule %',
    'Schedule Note',
    'Financial (CPI) %',
    'Financial Note',
    'Manpower %',
    'Manpower Note',
    'Safety %',
    'Safety Status',
    'Compliance %',
    'Compliance Note',
    'Drawings %',
    'DPR / Reports Note',
    'Trend',
    'Last Updated',
  ];

  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headers.forEach((_, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });

  cards.forEach((card) => {
    const schedule = vitalValue(card, 'schedule');
    const budget = vitalValue(card, 'budget');
    const manpower = vitalValue(card, 'manpower');
    const safety = vitalValue(card, 'safety');
    const compliance = vitalValue(card, 'compliance');
    const drawings = vitalValue(card, 'drawings');
    const reports = vitalValue(card, 'reports');

    sheet.addRow([
      card.title,
      card.location,
      card.pmName,
      card.overallScore ?? '—',
      card.projectStatusLabel || card.healthLabel,
      formatPercent(schedule.percent),
      schedule.note,
      formatPercent(budget.percent),
      budget.note,
      formatPercent(manpower.percent),
      manpower.note,
      formatPercent(safety.percent),
      safety.note,
      formatPercent(compliance.percent),
      compliance.note,
      formatPercent(drawings.percent),
      reports.note,
      card.trend,
      card.lastUpdate,
    ]);
  });

  const widths = [36, 22, 16, 12, 14, 11, 28, 14, 28, 11, 22, 11, 18, 13, 24, 11, 22, 12, 18];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
    });
  });

  const notes = workbook.addWorksheet('Score Formulas');
  notes.addRow(['Metric', 'Calculation']);
  notes.getRow(1).font = { bold: true };
  Object.entries(PORTFOLIO_SCORE_FORMULAS).forEach(([metric, formula]) => {
    notes.addRow([metric, formula]);
  });
  notes.getColumn(1).width = 18;
  notes.getColumn(2).width = 90;

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

export function pmcHead360CompareFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `pmc-head-project-comparison-${stamp}.xlsx`;
}
