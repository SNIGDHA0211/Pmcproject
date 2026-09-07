import ExcelJS from 'exceljs';
import type { ManagedUser, Project } from '../types';
import type { ProjectVitalsCard } from './projectVitals';
import { formatHealthLabelDisplay } from './projectVitals';
import { loadUserDirectory } from './userDirectory';
import {
  areDuplicateProjectTitles,
  normalizeProjectTitleKey,
  resolvePortfolioTeamLeaderUsername,
} from './hseSiteEngineerProjects';
import { getUsers } from '../services/userManagementApi';

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

/** Shown in Excel when no Team Leader is linked to the project. */
export const TL_MSG_NOT_ASSIGNED = 'Not Assigned';
/** Shown when a person/name exists but login username is missing. */
export const TL_MSG_USERNAME_MISSING = 'Username not available';

type ProjectTeamLeaderRef = {
  fullName: string;
  username: string;
};

function looksLikeUsername(value: string): boolean {
  const v = value.trim();
  return /^[a-z0-9._-]{3,50}$/i.test(v) && !/\s/.test(v);
}

function isBlankLeadLabel(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    !v ||
    v === '—' ||
    v === '-' ||
    v === 'not assigned' ||
    v === 'n/a' ||
    v === 'na' ||
    v === 'tbd'
  );
}

function isTeamLeaderRole(role: string): boolean {
  return role.trim().toLowerCase() === 'team leader';
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

/** Load all Team Leaders and index them by assigned project id + project name. */
async function loadTeamLeadersByProject(): Promise<{
  byProjectId: Map<string, ProjectTeamLeaderRef>;
  byProjectName: Map<string, ProjectTeamLeaderRef>;
}> {
  const byProjectId = new Map<string, ProjectTeamLeaderRef>();
  const byProjectName = new Map<string, ProjectTeamLeaderRef>();

  const absorb = (user: ManagedUser) => {
    if (!isTeamLeaderRole(user.role) || !user.isActive) return;
    const username = String(user.username ?? '').trim();
    if (!username) return;
    const ref: ProjectTeamLeaderRef = {
      fullName: String(user.fullName ?? '').trim() || username,
      username,
    };
    for (const project of user.projects ?? []) {
      const id = String(project.id ?? '').trim();
      if (id) {
        const existing = byProjectId.get(id);
        // Prefer pmc_tl* style logins when multiple TLs exist on one project.
        if (!existing || /^pmc_tl/i.test(username)) {
          byProjectId.set(id, ref);
        }
      }
      const nameKey = normalizeProjectTitleKey(project.name);
      if (nameKey) {
        const existing = byProjectName.get(nameKey);
        if (!existing || /^pmc_tl/i.test(username)) {
          byProjectName.set(nameKey, ref);
        }
      }
    }
  };

  try {
    let page = 1;
    let guard = 0;
    while (guard < 30) {
      guard += 1;
      const result = await getUsers({
        role: 'Team Leader',
        status: 'active',
        page,
        page_size: 100,
      });
      if (!result.success) break;
      result.results.forEach(absorb);
      if (!result.next || result.results.length === 0) break;
      page += 1;
    }
  } catch {
    // Optional enrichment — export still works without UM list.
  }

  return { byProjectId, byProjectName };
}

function findAssignedTeamLeader(
  card: ProjectVitalsCard,
  project: Project | undefined,
  byProjectId: Map<string, ProjectTeamLeaderRef>,
  byProjectName: Map<string, ProjectTeamLeaderRef>,
): ProjectTeamLeaderRef | null {
  const ids = [
    String(card.projectId ?? '').trim(),
    String(project?.id ?? '').trim(),
  ].filter(Boolean);

  for (const id of ids) {
    if (isNaN(Number(id))) continue;
    const hit = byProjectId.get(id);
    if (hit) return hit;
  }

  const titles = [card.title, project?.title].map((t) => String(t ?? '').trim()).filter(Boolean);
  for (const title of titles) {
    const key = normalizeProjectTitleKey(title);
    const exact = byProjectName.get(key);
    if (exact) return exact;

    for (const [nameKey, ref] of byProjectName.entries()) {
      if (
        areDuplicateProjectTitles(nameKey, title) ||
        nameKey.includes(key) ||
        key.includes(nameKey)
      ) {
        // Avoid tiny false matches (e.g. "ko")
        if (Math.min(nameKey.length, key.length) >= 5) return ref;
      }
    }
  }

  return null;
}

function lookupDirectoryUsername(
  directory: Awaited<ReturnType<typeof loadUserDirectory>>,
  leadId: string,
  leadName: string,
): string {
  const nameLower = leadName.trim().toLowerCase();
  const match = directory.find((user) => {
    if (leadId && String(user.id) === leadId) return true;
    const userName = String(user.name ?? '').trim().toLowerCase();
    const userLogin = String(user.username ?? '').trim().toLowerCase();
    if (nameLower && userName === nameLower) return true;
    if (nameLower && userLogin === nameLower) return true;
    if (nameLower && userName && (userName.includes(nameLower) || nameLower.includes(userName))) {
      if (nameLower.length >= 5 && userName.length >= 5) return true;
    }
    return false;
  });
  return String(match?.username ?? '').trim();
}

function resolveTeamLeaderDisplayName(
  card: ProjectVitalsCard,
  project: Project | undefined,
  assigned: ProjectTeamLeaderRef | null,
): string {
  if (assigned?.fullName) return assigned.fullName;

  const raw =
    String(project?.teamLeadName ?? '').trim() ||
    String(card.pmName ?? '').trim();

  if (isBlankLeadLabel(raw)) return TL_MSG_NOT_ASSIGNED;
  return raw;
}

/**
 * Resolve Team Leader login for Excel.
 * Prefer User Management assignment (source of truth), then project/overview fields.
 */
function resolveTeamLeaderUsername(
  card: ProjectVitalsCard,
  project: Project | undefined,
  directory: Awaited<ReturnType<typeof loadUserDirectory>>,
  teamLeaderName: string,
  assigned: ProjectTeamLeaderRef | null,
): string {
  if (assigned?.username) return assigned.username;

  const fromCard = String(card.teamLeadUsername ?? '').trim();
  if (fromCard) return fromCard;

  const fromProject = String(project?.teamLeadUsername ?? '').trim();
  if (fromProject) return fromProject;

  const pmName = String(card.pmName ?? '').trim();
  if (pmName && looksLikeUsername(pmName) && !isBlankLeadLabel(pmName)) {
    return pmName;
  }

  const leadId = String(project?.teamLeadId ?? '').trim();
  const leadName = isBlankLeadLabel(teamLeaderName) ? '' : teamLeaderName;

  if (leadId || leadName) {
    const fromDirectory = lookupDirectoryUsername(directory, leadId, leadName);
    if (fromDirectory) return fromDirectory;
  }

  if (leadName && looksLikeUsername(leadName)) {
    return leadName;
  }

  const fromPortfolio =
    resolvePortfolioTeamLeaderUsername(card.title) ||
    resolvePortfolioTeamLeaderUsername(project?.title);
  if (fromPortfolio) return fromPortfolio;

  if (isBlankLeadLabel(teamLeaderName) || teamLeaderName === TL_MSG_NOT_ASSIGNED) {
    return TL_MSG_NOT_ASSIGNED;
  }

  return TL_MSG_USERNAME_MISSING;
}

function isUsernameStatusMessage(value: string): boolean {
  return (
    value === TL_MSG_NOT_ASSIGNED ||
    value === TL_MSG_USERNAME_MISSING ||
    value === '—' ||
    value === '-'
  );
}

export async function buildPortfolioProjectListRows(
  cards: ProjectVitalsCard[],
  projects: Project[] = [],
): Promise<PortfolioProjectListRow[]> {
  const sorted = [...cards].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );

  const [directory, tlIndex] = await Promise.all([
    loadUserDirectory().catch(() => []),
    loadTeamLeadersByProject(),
  ]);

  const rows: PortfolioProjectListRow[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const card = sorted[i];
    const project = findMatchingProject(card, projects);
    const assigned = findAssignedTeamLeader(
      card,
      project,
      tlIndex.byProjectId,
      tlIndex.byProjectName,
    );
    const teamLeaderName = resolveTeamLeaderDisplayName(card, project, assigned);
    const teamLeaderUsername = resolveTeamLeaderUsername(
      card,
      project,
      directory,
      teamLeaderName,
      assigned,
    );
    const status =
      String(card.projectStatusLabel ?? '').trim() ||
      formatHealthLabelDisplay(card.healthLabel) ||
      'No Data';

    rows.push({
      serial: i + 1,
      projectName: String(card.title ?? '').trim() || `Project ${card.projectId}`,
      teamLeaderName,
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
  metaCell.value = `Total projects: ${rows.length}  ·  Generated: ${generatedAt}  ·  Team Leader usernames from User Management assignments`;
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
      if (colIndex === 3) {
        if (isUsernameStatusMessage(String(value))) {
          cell.font = { italic: true, size: 10, color: { argb: 'FFB45309' } };
        } else {
          cell.font = { name: 'Consolas', size: 11, bold: true, color: { argb: 'FF1D4ED8' } };
        }
      }
      if (colIndex === 2 && (value === TL_MSG_NOT_ASSIGNED || value === 'Not Assigned')) {
        cell.font = { italic: true, color: { argb: 'FF94A3B8' } };
      }
    });
    excelRow.height = 20;
  });

  const widths = [6, 42, 28, 28, 22, 24, 14, 12];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  const legend = workbook.addWorksheet('How to read');
  legend.addRow(['Column', 'Meaning']);
  legend.getRow(1).fill = HEADER_FILL;
  legend.getRow(1).font = HEADER_FONT;
  [
    ['Project Name', 'Official project title in the live portfolio'],
    [
      'Team Leader (Full Name)',
      'From User Management Team Leader assigned to this project (e.g. Chandrashekhar Society → Pmc_tl31)',
    ],
    [
      'Team Leader Username',
      'Login from User Management. If a TL is assigned → username (pmc_tl31). If TL exists without login → "Username not available". If nobody assigned → "Not Assigned".',
    ],
    ['Client', 'Client / agency name when available'],
    ['Location', 'Project site location'],
    ['Status', 'Current portfolio health / overview status'],
    ['Overall Score', 'Health score out of 100 when KPI data exists'],
  ].forEach((pair) => legend.addRow(pair));
  legend.getColumn(1).width = 28;
  legend.getColumn(2).width = 90;

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
