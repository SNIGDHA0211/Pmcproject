import ExcelJS from 'exceljs';
import type { Project } from '../types';
import type { ProjectVitalsCard } from './projectVitals';
import { formatHealthLabelDisplay } from './projectVitals';
import { loadUserDirectory } from './userDirectory';
import { areDuplicateProjectTitles, normalizeProjectTitleKey } from './hseSiteEngineerProjects';

const TITLE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF312E81' },
};

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

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

const ALT_ROW_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' },
};

export type PortfolioProjectListRow = {
  serial: number;
  projectName: string;
  teamLeaderName: string;
  teamLeaderUsername: string;
  client: string;
  location: string;
  status: string;
  overallScore: string;
};

function looksLikeUsername(value: string): boolean {
  const v = value.trim();
  return /^[a-z0-9._-]{3,50}$/i.test(v) && !/\s/.test(v);
}

function findMatchingProject(
  card: ProjectVitalsCard,
  projects: Project[],
): Project | undefined {
  const id = String(card.projectId ?? '');
  const byId = projects.find((p) => String(p.id) === id);
  if (byId) return byId;
  return projects.find(
    (p) =>
      normalizeProjectTitleKey(p.title) === normalizeProjectTitleKey(card.title) ||
      areDuplicateProjectTitles(p.title, card.title),
  );
}

async function resolveTeamLeaderUsername(
  card: ProjectVitalsCard,
  project: Project | undefined,
  directory: Awaited<ReturnType<typeof loadUserDirectory>>,
): Promise<string> {
  const fromCard = String(card.teamLeadUsername ?? '').trim();
  if (fromCard) return fromCard;

  const fromProject = String(project?.teamLeadUsername ?? '').trim();
  if (fromProject) return fromProject;

  const pmName = String(card.pmName ?? '').trim();
  if (pmName && looksLikeUsername(pmName) && pmName.toLowerCase() !== 'not assigned') {
    return pmName;
  }

  const leadId = String(project?.teamLeadId ?? '').trim();
  const leadName = String(project?.teamLeadName ?? card.pmName ?? '').trim();
  if (!leadId && (!leadName || leadName === 'Not Assigned')) return '—';

  const match = directory.find((user) => {
    if (leadId && String(user.id) === leadId) return true;
    if (leadName && String(user.name ?? '').trim().toLowerCase() === leadName.toLowerCase()) {
      return true;
    }
    if (leadName && String(user.username ?? '').trim().toLowerCase() === leadName.toLowerCase()) {
      return true;
    }
    return false;
  });
  const username = String(match?.username ?? '').trim();
  return username || '—';
}

export async function buildPortfolioProjectListRows(
  cards: ProjectVitalsCard[],
  projects: Project[] = [],
): Promise<PortfolioProjectListRow[]> {
  const sorted = [...cards].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );

  let directory: Awaited<ReturnType<typeof loadUserDirectory>> = [];
  try {
    directory = await loadUserDirectory();
  } catch {
    directory = [];
  }

  const rows: PortfolioProjectListRow[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const card = sorted[i];
    const project = findMatchingProject(card, projects);
    const teamLeaderName =
      String(project?.teamLeadName ?? card.pmName ?? '').trim() || 'Not Assigned';
    const teamLeaderUsername = await resolveTeamLeaderUsername(card, project, directory);
    const status =
      String(card.projectStatusLabel ?? '').trim() ||
      formatHealthLabelDisplay(card.healthLabel) ||
      '—';

    rows.push({
      serial: i + 1,
      projectName: String(card.title ?? '').trim() || `Project ${card.projectId}`,
      teamLeaderName:
        teamLeaderName.toLowerCase() === 'not assigned' ? 'Not Assigned' : teamLeaderName,
      teamLeaderUsername,
      client: String(card.client ?? '').trim() || '—',
      location: String(card.location ?? '').trim() || '—',
      status,
      overallScore: card.overallScore == null ? '—' : String(card.overallScore),
    });
  }
  return rows;
}

export async function downloadPortfolioProjectListExcel(
  cards: ProjectVitalsCard[],
  projects: Project[] = [],
  filename?: string,
): Promise<void> {
  const rows = await buildPortfolioProjectListRows(cards, projects);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PMC Portal';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Project List', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  const colCount = 8;
  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'PMC Portal — Project Portfolio List';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = TITLE_FILL;
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, colCount);
  const metaCell = sheet.getCell(2, 1);
  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  metaCell.value = `Total projects: ${rows.length}  ·  Generated: ${generatedAt}  ·  Columns show which Team Leader handles each project`;
  metaCell.font = { size: 10, color: { argb: 'FF334155' }, italic: true };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  sheet.getRow(2).height = 22;

  const headers = [
    '#',
    'Project Name',
    'Team Leader (Full Name)',
    'Team Leader Username',
    'Client',
    'Location',
    'Status',
    'Overall Score',
  ];
  const headerRow = sheet.getRow(3);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 24;

  rows.forEach((row, index) => {
    const excelRow = sheet.getRow(index + 4);
    const values = [
      row.serial,
      row.projectName,
      row.teamLeaderName,
      row.teamLeaderUsername,
      row.client,
      row.location,
      row.status,
      row.overallScore,
    ];
    values.forEach((value, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      cell.value = value;
      cell.border = THIN_BORDER;
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIndex === 0 || colIndex === 7 ? 'center' : 'left',
        wrapText: true,
      };
      if (index % 2 === 1) cell.fill = ALT_ROW_FILL;
      if (colIndex === 3 && value !== '—') {
        cell.font = { name: 'Consolas', size: 11, bold: true, color: { argb: 'FF1D4ED8' } };
      }
      if (colIndex === 2 && value === 'Not Assigned') {
        cell.font = { italic: true, color: { argb: 'FF94A3B8' } };
      }
    });
    excelRow.height = 20;
  });

  const widths = [6, 42, 26, 22, 22, 24, 14, 12];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  const legend = workbook.addWorksheet('How to read');
  legend.addRow(['Column', 'Meaning']);
  legend.getRow(1).font = { bold: true };
  legend.getRow(1).fill = HEADER_FILL;
  legend.getRow(1).font = HEADER_FONT;
  [
    ['Project Name', 'Official project title in the live portfolio'],
    ['Team Leader (Full Name)', 'Person responsible for handling this project'],
    ['Team Leader Username', 'Login username used in PMC Portal (e.g. pmc_tl29)'],
    ['Client', 'Client / agency name when available'],
    ['Location', 'Project site location'],
    ['Status', 'Current portfolio health / overview status'],
    ['Overall Score', 'Health score out of 100 when KPI data exists'],
  ].forEach((pair) => legend.addRow(pair));
  legend.getColumn(1).width = 28;
  legend.getColumn(2).width = 70;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safeName = (filename || portfolioProjectListFilename()).endsWith('.xlsx')
    ? filename || portfolioProjectListFilename()
    : `${filename || portfolioProjectListFilename()}.xlsx`;
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

export function portfolioProjectListFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `pmc-project-portfolio-list-${stamp}.xlsx`;
}
