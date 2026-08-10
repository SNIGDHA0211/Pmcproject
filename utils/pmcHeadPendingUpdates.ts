import type { AppNotification } from '../types';
import { ROLE_LABELS } from '../constants';
import { UserRole } from '../types';
import {
  formatSubRoleUsername,
  parseSubRoleUsername,
  resolveActorDisplayName,
} from './actorDisplay';
import {
  loadProjectsForActorFallback,
  type ProjectAssigneeInfo,
} from './projectActorFallback';
import { loadUserDirectory, lookupDirectoryUser, type DirectoryUser } from './userDirectory';

export type RoleBucket = 'tl' | 'se' | 'qaqc' | 'bse';

export interface RoleSectionDef {
  moduleName: string;
  sectionKey: string;
  sectionLabel: string;
}

export const ROLE_SECTION_DEFS: Record<RoleBucket, RoleSectionDef[]> = {
  tl: [
    { moduleName: 'Manpower Management', sectionKey: 'manpower', sectionLabel: 'Manpower' },
    { moduleName: 'WPR', sectionKey: 'wpr', sectionLabel: 'WPR' },
    { moduleName: 'Project Dates', sectionKey: 'project_dates', sectionLabel: 'Project Dates' },
    { moduleName: 'Correspondence', sectionKey: 'correspondence', sectionLabel: 'Correspondence' },
  ],
  se: [
    { moduleName: 'Site Photos', sectionKey: 'site_photos', sectionLabel: 'Site Photos' },
    { moduleName: 'Monthly Scope', sectionKey: 'monthly_scope', sectionLabel: 'Monthly Scope' },
    { moduleName: 'DPR', sectionKey: 'dpr', sectionLabel: 'DPR' },
  ],
  qaqc: [
    { moduleName: 'Health & Safety', sectionKey: 'hse', sectionLabel: 'HSE' },
    { moduleName: 'Quality Status', sectionKey: 'quality', sectionLabel: 'Quality' },
  ],
  bse: [
    { moduleName: 'Invoicing', sectionKey: 'invoicing', sectionLabel: 'Invoicing' },
    { moduleName: 'Cash Flow', sectionKey: 'cash_flow', sectionLabel: 'Cash Flow' },
  ],
};

export interface PendingModuleUpdate {
  id: string;
  displayName: string;
  username?: string;
  userIdLabel: string;
  roleLabel: string;
  roleBucket: RoleBucket;
  projectName: string;
  moduleName: string;
  sectionKey: string;
  sectionLabel: string;
}

export interface PendingSection {
  sectionKey: string;
  sectionLabel: string;
  moduleName: string;
  projectNames: string[];
}

export interface PendingUserGroup {
  displayName: string;
  username?: string;
  userIdLabel: string;
  roleLabel: string;
  roleBucket: RoleBucket;
  /** Unique sections this user has not updated */
  pendingSectionCount: number;
  projectNames: string[];
  sectionLabels: string[];
  sections: PendingSection[];
  items: PendingModuleUpdate[];
}

export interface PendingRoleBucketSummary {
  key: RoleBucket;
  label: string;
  shortLabel: string;
  notUpdatedCount: number;
}

export interface PendingUpdatesSummary {
  /** Team members / sub-roles with at least one missing section */
  totalNotUpdated: number;
  totalAssignees: number;
  windowDays: number;
  byRoleBucket: PendingRoleBucketSummary[];
  byUser: PendingUserGroup[];
  items: PendingModuleUpdate[];
}

interface ExpectedSlot {
  id: string;
  projectName: string;
  moduleName: string;
  sectionKey: string;
  sectionLabel: string;
  roleBucket: RoleBucket;
  displayName: string;
  username?: string;
  userIdLabel: string;
  roleLabel: string;
  matchKeys: string[];
}

function roleBucketFromLabel(roleLabel: string): RoleBucket {
  switch (roleLabel) {
    case ROLE_LABELS[UserRole.TEAM_LEAD]:
      return 'tl';
    case ROLE_LABELS[UserRole.QAQC_SITE_ENGINEER]:
      return 'qaqc';
    case ROLE_LABELS[UserRole.BILLING_SITE_ENGINEER]:
      return 'bse';
    default:
      return 'se';
  }
}

function roleLabelFromBucket(bucket: RoleBucket): string {
  switch (bucket) {
    case 'tl':
      return ROLE_LABELS[UserRole.TEAM_LEAD];
    case 'qaqc':
      return ROLE_LABELS[UserRole.QAQC_SITE_ENGINEER];
    case 'bse':
      return ROLE_LABELS[UserRole.BILLING_SITE_ENGINEER];
    default:
      return ROLE_LABELS[UserRole.SITE_ENGINEER];
  }
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeModuleName(moduleName: string): string {
  return normalizeToken(moduleName);
}

function normalizeProjectName(projectName: string): string {
  return normalizeToken(projectName.replace(/\s*\([^)]*\)\s*/g, ' '));
}

function projectsMatch(a: string, b: string): boolean {
  const left = normalizeProjectName(a);
  const right = normalizeProjectName(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function modulesMatch(a: string, b: string): boolean {
  return normalizeModuleName(a) === normalizeModuleName(b);
}

function isRecent(iso: string, maxAgeDays: number): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return time >= Date.now() - maxAgeDays * 86_400_000;
}

function uniqueKeys(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(lower);
  }
  return result;
}

function buildMatchKeys(
  username?: string,
  displayName?: string,
  extra?: string,
): string[] {
  return uniqueKeys([
    username,
    parseSubRoleUsername(username),
    formatSubRoleUsername(username)?.toLowerCase(),
    parseSubRoleUsername(displayName),
    formatSubRoleUsername(displayName)?.toLowerCase(),
    displayName,
    extra,
  ]);
}

function resolveAssignee(
  keys: string[],
  directory: DirectoryUser[],
  roleLabel: string,
  roleBucket: RoleBucket,
): Omit<ExpectedSlot, 'id' | 'projectName' | 'moduleName' | 'sectionKey' | 'sectionLabel'> | null {
  for (const key of keys) {
    const directoryUser = lookupDirectoryUser(directory, key);

    if (directoryUser) {
      const displayName = resolveActorDisplayName({
        name: directoryUser.name,
        username: directoryUser.username,
        roleLabel: directoryUser.roleLabel || roleLabel,
      });
      const username = directoryUser.username || parseSubRoleUsername(key);
      return {
        displayName,
        username,
        userIdLabel: formatSubRoleUsername(username) || username || displayName,
        roleLabel: directoryUser.roleLabel || roleLabel,
        roleBucket,
        matchKeys: buildMatchKeys(username, displayName, key),
      };
    }

    const parsed = parseSubRoleUsername(key);
    if (parsed) {
      const displayName = formatSubRoleUsername(parsed) || parsed.toUpperCase();
      return {
        displayName,
        username: parsed,
        userIdLabel: displayName,
        roleLabel,
        roleBucket,
        matchKeys: buildMatchKeys(parsed, displayName, key),
      };
    }
  }

  const fallbackKey = keys.find((key) => key.trim());
  if (!fallbackKey) return null;

  return {
    displayName: fallbackKey,
    username: parseSubRoleUsername(fallbackKey),
    userIdLabel: formatSubRoleUsername(fallbackKey) || fallbackKey,
    roleLabel,
    roleBucket,
    matchKeys: buildMatchKeys(parseSubRoleUsername(fallbackKey), fallbackKey),
  };
}

function addSlotsForAssignee(
  slots: ExpectedSlot[],
  project: ProjectAssigneeInfo,
  keys: string[],
  roleBucket: RoleBucket,
  directory: DirectoryUser[],
): void {
  const roleLabel = roleLabelFromBucket(roleBucket);
  const assignee = resolveAssignee(keys, directory, roleLabel, roleBucket);
  if (!assignee) return;

  for (const section of ROLE_SECTION_DEFS[roleBucket]) {
    slots.push({
      id: `${project.title}|${section.sectionKey}|${assignee.userIdLabel}`,
      projectName: project.title,
      moduleName: section.moduleName,
      sectionKey: section.sectionKey,
      sectionLabel: section.sectionLabel,
      ...assignee,
    });
  }
}

function buildExpectedSlots(
  projects: ProjectAssigneeInfo[],
  directory: DirectoryUser[],
): ExpectedSlot[] {
  const slots: ExpectedSlot[] = [];

  for (const project of projects) {
    if (!project.title.trim()) continue;

    addSlotsForAssignee(
      slots,
      project,
      [project.teamLeadId, project.teamLeadName].filter(Boolean) as string[],
      'tl',
      directory,
    );

    const siteEngineerCount = Math.max(
      project.siteEngineerIds.length,
      project.siteEngineerNames.length,
    );
    for (let index = 0; index < siteEngineerCount; index += 1) {
      addSlotsForAssignee(
        slots,
        project,
        [project.siteEngineerIds[index], project.siteEngineerNames[index]].filter(
          Boolean,
        ) as string[],
        'se',
        directory,
      );
    }

    addSlotsForAssignee(
      slots,
      project,
      [project.qaqcEngineerId, project.qaqcEngineerName].filter(Boolean) as string[],
      'qaqc',
      directory,
    );

    addSlotsForAssignee(
      slots,
      project,
      [project.billingEngineerId, project.billingEngineerName].filter(
        Boolean,
      ) as string[],
      'bse',
      directory,
    );
  }

  return slots;
}

function userKeysFromNotification(notification: AppNotification): string[] {
  return buildMatchKeys(
    notification.senderUsername,
    notification.senderName,
    formatSubRoleUsername(notification.senderUsername || notification.senderName),
  );
}

function isSlotUpdated(
  slot: ExpectedSlot,
  notifications: AppNotification[],
  windowDays: number,
): boolean {
  return notifications.some((notification) => {
    if (!notification.createdAt || !isRecent(notification.createdAt, windowDays)) {
      return false;
    }
    if (!notification.projectName || !notification.moduleName) return false;
    if (!projectsMatch(notification.projectName, slot.projectName)) return false;
    if (!modulesMatch(notification.moduleName, slot.moduleName)) return false;

    const notificationKeys = userKeysFromNotification(notification);
    return slot.matchKeys.some((slotKey) => notificationKeys.includes(slotKey));
  });
}

function groupPendingByUser(items: PendingModuleUpdate[]): PendingUserGroup[] {
  const groups = new Map<string, PendingUserGroup>();

  for (const item of items) {
    const key = `${item.userIdLabel}|${item.roleBucket}`;
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      if (!existing.projectNames.includes(item.projectName)) {
        existing.projectNames.push(item.projectName);
      }

      let section = existing.sections.find((entry) => entry.sectionKey === item.sectionKey);
      if (!section) {
        section = {
          sectionKey: item.sectionKey,
          sectionLabel: item.sectionLabel,
          moduleName: item.moduleName,
          projectNames: [item.projectName],
        };
        existing.sections.push(section);
        existing.sectionLabels.push(item.sectionLabel);
        existing.pendingSectionCount = existing.sections.length;
      } else if (!section.projectNames.includes(item.projectName)) {
        section.projectNames.push(item.projectName);
      }
      continue;
    }

    groups.set(key, {
      displayName: item.displayName,
      username: item.username,
      userIdLabel: item.userIdLabel,
      roleLabel: item.roleLabel,
      roleBucket: item.roleBucket,
      pendingSectionCount: 1,
      projectNames: [item.projectName],
      sectionLabels: [item.sectionLabel],
      sections: [
        {
          sectionKey: item.sectionKey,
          sectionLabel: item.sectionLabel,
          moduleName: item.moduleName,
          projectNames: [item.projectName],
        },
      ],
      items: [item],
    });
  }

  const bucketOrder: Record<RoleBucket, number> = { tl: 0, se: 1, qaqc: 2, bse: 3 };

  return [...groups.values()].sort((a, b) => {
    const bucketDiff = bucketOrder[a.roleBucket] - bucketOrder[b.roleBucket];
    if (bucketDiff !== 0) return bucketDiff;
    if (b.pendingSectionCount !== a.pendingSectionCount) {
      return b.pendingSectionCount - a.pendingSectionCount;
    }
    return a.userIdLabel.localeCompare(b.userIdLabel);
  });
}

function buildRoleBucketSummaries(byUser: PendingUserGroup[]): PendingRoleBucketSummary[] {
  const defs: Array<{ key: RoleBucket; label: string; shortLabel: string }> = [
    { key: 'tl', label: 'Team Leader', shortLabel: 'TL' },
    { key: 'se', label: 'Site Engineer', shortLabel: 'SE' },
    { key: 'qaqc', label: 'QAQC Site Engineer', shortLabel: 'QAQC' },
    { key: 'bse', label: 'Billing Site Engineer', shortLabel: 'BSE' },
  ];

  return defs.map((def) => ({
    ...def,
    notUpdatedCount: byUser.filter((user) => user.roleBucket === def.key).length,
  }));
}

export function buildPendingUpdatesSummary(
  notifications: AppNotification[],
  projects: ProjectAssigneeInfo[],
  directory: DirectoryUser[],
  options?: { windowDays?: number },
): PendingUpdatesSummary {
  const windowDays = options?.windowDays ?? 30;
  const expectedSlots = buildExpectedSlots(projects, directory);
  const uniqueAssignees = new Set(
    expectedSlots.map((slot) => `${slot.userIdLabel}|${slot.roleBucket}`),
  );

  const pendingItems: PendingModuleUpdate[] = expectedSlots
    .filter((slot) => !isSlotUpdated(slot, notifications, windowDays))
    .map((slot) => ({
      id: slot.id,
      displayName: slot.displayName,
      username: slot.username,
      userIdLabel: slot.userIdLabel,
      roleLabel: slot.roleLabel,
      roleBucket: slot.roleBucket,
      projectName: slot.projectName,
      moduleName: slot.moduleName,
      sectionKey: slot.sectionKey,
      sectionLabel: slot.sectionLabel,
    }));

  const byUser = groupPendingByUser(pendingItems);
  const byRoleBucket = buildRoleBucketSummaries(byUser);

  return {
    totalNotUpdated: byUser.length,
    totalAssignees: uniqueAssignees.size,
    windowDays,
    byRoleBucket,
    byUser,
    items: pendingItems,
  };
}

export async function fetchPendingUpdatesSummary(
  notifications: AppNotification[],
  options?: {
    windowDays?: number;
    projects?: ProjectAssigneeInfo[];
    directory?: DirectoryUser[];
  },
): Promise<PendingUpdatesSummary> {
  const [directory, projects] = await Promise.all([
    options?.directory
      ? Promise.resolve(options.directory)
      : loadUserDirectory(),
    options?.projects?.length
      ? Promise.resolve(options.projects)
      : loadProjectsForActorFallback(),
  ]);
  return buildPendingUpdatesSummary(notifications, projects, directory, options);
}
