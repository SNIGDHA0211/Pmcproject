import { ROLE_LABELS } from '../constants';
import type { Project } from '../types';
import { UserRole } from '../types';
import type { DirectoryUser } from './userDirectory';

export type ExecutionTeamSlotKey =
  | 'pmc_head'
  | 'team_lead'
  | 'coordinator'
  | 'site_engineer'
  | 'billing'
  | 'qaqc'
  | 'hse';

export interface ExecutionTeamMember {
  key: ExecutionTeamSlotKey;
  /** Stable row id for React lists */
  rowId: string;
  roleLabel: string;
  roleHint: string;
  userId?: string;
  name: string;
  assigned: boolean;
}

function resolveName(
  id: string | undefined,
  explicitName: string | undefined,
  directory: DirectoryUser[],
): string {
  const trimmed = String(explicitName ?? '').trim();
  if (trimmed) return trimmed;
  if (!id) return '';
  const hit = directory.find((u) => String(u.id) === String(id));
  if (!hit) return '';
  return String(hit.name || hit.username || '').trim();
}

/**
 * Build a clear, role-grouped roster for the Execution Team panel.
 * Always includes core slots so empty roles are visible as "Not assigned".
 */
export function buildExecutionTeamRoster(
  project: Project,
  directory: DirectoryUser[] = [],
): ExecutionTeamMember[] {
  const rows: ExecutionTeamMember[] = [];

  const pmcId = project.pmcHeadId?.trim() || undefined;
  const pmcName = resolveName(pmcId, project.pmcHeadName, directory);
  if (pmcId || pmcName) {
    rows.push({
      key: 'pmc_head',
      rowId: `pmc-${pmcId || 'named'}`,
      roleLabel: ROLE_LABELS[UserRole.PMC_HEAD],
      roleHint: 'Overall project owner',
      userId: pmcId,
      name: pmcName || 'PMC Head',
      assigned: true,
    });
  }

  const tlId = project.teamLeadId?.trim() || undefined;
  const tlName = resolveName(tlId, project.teamLeadName, directory);
  rows.push({
    key: 'team_lead',
    rowId: `tl-${tlId || 'vacant'}`,
    roleLabel: ROLE_LABELS[UserRole.TEAM_LEAD],
    roleHint: 'Day-to-day project lead',
    userId: tlId,
    name: tlName || 'Not assigned',
    assigned: Boolean(tlId || tlName),
  });

  const coordIds = project.coordinatorIds ?? [];
  const coordNames = project.coordinatorNames ?? [];
  if (coordIds.length === 0 && coordNames.length === 0) {
    rows.push({
      key: 'coordinator',
      rowId: 'coord-vacant',
      roleLabel: ROLE_LABELS[UserRole.COORDINATOR],
      roleHint: 'PMC manager / coordination',
      name: 'Not assigned',
      assigned: false,
    });
  } else {
    const count = Math.max(coordIds.length, coordNames.length);
    for (let i = 0; i < count; i += 1) {
      const id = coordIds[i];
      const name = resolveName(id, coordNames[i], directory);
      rows.push({
        key: 'coordinator',
        rowId: `coord-${id || i}`,
        roleLabel: ROLE_LABELS[UserRole.COORDINATOR],
        roleHint: 'PMC manager / coordination',
        userId: id,
        name: name || (id ? `User #${id}` : 'Not assigned'),
        assigned: Boolean(id || name),
      });
    }
  }

  const seIds = project.siteEngineerIds ?? [];
  const seNames = project.siteEngineerNames ?? [];
  if (seIds.length === 0 && seNames.length === 0) {
    rows.push({
      key: 'site_engineer',
      rowId: 'se-vacant',
      roleLabel: ROLE_LABELS[UserRole.SITE_ENGINEER],
      roleHint: 'Field progress & DPR',
      name: 'Not assigned',
      assigned: false,
    });
  } else {
    const count = Math.max(seIds.length, seNames.length);
    for (let i = 0; i < count; i += 1) {
      const id = seIds[i];
      const name = resolveName(id, seNames[i], directory);
      rows.push({
        key: 'site_engineer',
        rowId: `se-${id || i}`,
        roleLabel: ROLE_LABELS[UserRole.SITE_ENGINEER],
        roleHint: 'Field progress & DPR',
        userId: id,
        name: name || (id ? `User #${id}` : 'Not assigned'),
        assigned: Boolean(id || name),
      });
    }
  }

  const billingId = project.billingEngineerId?.trim() || undefined;
  const billingName = resolveName(billingId, project.billingEngineerName, directory);
  rows.push({
    key: 'billing',
    rowId: `billing-${billingId || 'vacant'}`,
    roleLabel: ROLE_LABELS[UserRole.BILLING_SITE_ENGINEER],
    roleHint: 'Billing & receivables',
    userId: billingId,
    name: billingName || 'Not assigned',
    assigned: Boolean(billingId || billingName),
  });

  const qaqcId = project.qaqcEngineerId?.trim() || undefined;
  const qaqcName = resolveName(qaqcId, project.qaqcEngineerName, directory);
  rows.push({
    key: 'qaqc',
    rowId: `qaqc-${qaqcId || 'vacant'}`,
    roleLabel: ROLE_LABELS[UserRole.QAQC_SITE_ENGINEER],
    roleHint: 'Quality checks',
    userId: qaqcId,
    name: qaqcName || 'Not assigned',
    assigned: Boolean(qaqcId || qaqcName),
  });

  const hseId = project.hseEngineerId?.trim() || undefined;
  const hseName = resolveName(hseId, project.hseEngineerName, directory);
  rows.push({
    key: 'hse',
    rowId: `hse-${hseId || 'vacant'}`,
    roleLabel: ROLE_LABELS[UserRole.HSE_SITE_ENGINEER],
    roleHint: 'Health & safety',
    userId: hseId,
    name: hseName || 'Not assigned',
    assigned: Boolean(hseId || hseName),
  });

  return rows;
}

export function countAssignedExecutionTeam(members: ExecutionTeamMember[]): number {
  return members.filter((m) => m.assigned).length;
}
