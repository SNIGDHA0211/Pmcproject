import { ROLE_LABELS } from '../constants';
import { UserRole, type User } from '../types';
import type { DirectoryUser } from './userDirectory';
import { lookupDirectoryUser } from './userDirectory';

const GENERIC_ACTOR_NAMES = new Set([
  'user',
  'team member',
  'team leader',
  'team lead',
  'site engineer',
  'qaqc site engineer',
  'billing site engineer',
  'coordinator',
  'system',
  'admin',
]);

function resolveRoleLabel(role?: string): string | undefined {
  if (!role?.trim()) return undefined;
  const raw = role.trim();
  const enumMatch = Object.values(UserRole).find(
    (value) => value === raw || value.toLowerCase() === raw.toLowerCase(),
  );
  if (enumMatch) return ROLE_LABELS[enumMatch as UserRole];
  const labelMatch = Object.entries(ROLE_LABELS).find(
    ([, label]) => label.toLowerCase() === raw.toLowerCase(),
  );
  if (labelMatch) return labelMatch[1];
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function isGenericActorName(name?: string, roleLabel?: string): boolean {
  const value = (name || '').trim().toLowerCase();
  if (!value) return true;
  if (GENERIC_ACTOR_NAMES.has(value)) return true;
  if (roleLabel && value === roleLabel.trim().toLowerCase()) return true;
  return Object.values(ROLE_LABELS).some(
    (label) => label.toLowerCase() === value,
  );
}

/** Turn login ids like pmc_tl19 / qaqc1 / bse1 into readable sub-role labels. */
export function formatSubRoleUsername(username?: string): string | undefined {
  const parsed = parseSubRoleUsername(username);
  if (!parsed) return undefined;

  const match = parsed.match(/^([a-z]+)(\d+)$/i);
  if (match) {
    return `${match[1].toUpperCase()}${match[2]}`;
  }

  return parsed.replace(/_/g, ' ').toUpperCase();
}

/** Normalize sub-role login ids (tl21, pmc_se1, QAQC1) to lowercase token. */
export function parseSubRoleUsername(input?: string): string | undefined {
  const raw = input?.trim().toLowerCase();
  if (!raw) return undefined;

  const withoutPrefix = raw.replace(/^pmc[_-]?/, '').replace(/\s+/g, '');
  if (!withoutPrefix) return undefined;

  if (/^(tl|se|qaqc|bse|coord)\d+$/i.test(withoutPrefix)) {
    return withoutPrefix;
  }

  if (/^[a-z]+\d+$/i.test(withoutPrefix)) {
    return withoutPrefix;
  }

  return undefined;
}

export function resolveActorDisplayName(
  input: {
    name?: string;
    username?: string;
    email?: string;
    role?: UserRole | string;
    roleLabel?: string;
  },
): string {
  const roleLabel =
    input.roleLabel ||
    (input.role ? resolveRoleLabel(String(input.role)) : undefined);
  const usernameLabel = formatSubRoleUsername(input.username);
  const name = input.name?.trim();

  if (usernameLabel && name && !isGenericActorName(name, roleLabel)) {
    const normalizedName = name.toLowerCase();
    const normalizedUsername = usernameLabel.toLowerCase();
    if (
      normalizedName !== normalizedUsername &&
      !normalizedName.includes(normalizedUsername)
    ) {
      return `${name} · ${usernameLabel}`;
    }
  }

  if (usernameLabel) return usernameLabel;

  if (name && !isGenericActorName(name, roleLabel)) return name;

  return (
    input.username?.trim() ||
    name ||
    input.email?.trim() ||
    'Team member'
  );
}

export function resolveActorFromUser(user?: User | null): {
  displayName: string;
  username?: string;
  roleLabel: string;
  role?: UserRole;
} | undefined {
  if (!user) return undefined;
  const roleLabel = ROLE_LABELS[user.role] ?? resolveRoleLabel(user.role) ?? 'Team member';
  return {
    displayName: resolveActorDisplayName({
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      roleLabel,
    }),
    username: user.username,
    roleLabel,
    role: user.role,
  };
}

export function pickActorFieldsFromRecord(
  row: Record<string, unknown>,
  moduleName?: string,
  directory: DirectoryUser[] = [],
): { name?: string; username?: string; roleLabel?: string } {
  const idCandidates = [
    row.updated_by,
    row.created_by,
    row.user_id,
    row.uploaded_by_id,
    row.modified_by,
  ];

  for (const candidate of idCandidates) {
    const directoryUser = lookupDirectoryUser(directory, candidate as string | number);
    if (directoryUser) {
      return {
        name: directoryUser.name,
        username: directoryUser.username,
        roleLabel: directoryUser.roleLabel || resolveRoleLabelFromModule(moduleName),
      };
    }
  }

  const username = [
    row.username,
    row.updated_by_username,
    row.created_by_username,
    row.sender_username,
    row.user_username,
    row.uploaded_by_username,
  ].find((value) => typeof value === 'string' && value.trim()) as string | undefined;

  const name = [
    row.updated_by_name,
    row.created_by_name,
    row.uploaded_by_name,
    row.sender_name,
    row.sender,
  ].find((value) => typeof value === 'string' && value.trim()) as string | undefined;

  const uploadedBy = row.uploaded_by;
  const uploadedByUsername =
    typeof uploadedBy === 'string'
      ? parseSubRoleUsername(uploadedBy) ||
        (/^(pmc[_-])?[a-z]+\d*$/i.test(uploadedBy.trim())
          ? uploadedBy.trim().toLowerCase()
          : undefined)
      : undefined;

  const roleLabel = [
    row.updated_by_role_label,
    row.sender_role_label,
    row.created_by_role_label,
    row.updated_by_role,
    row.sender_role,
    row.created_by_role,
    row.user_role,
  ]
    .map((value) => (typeof value === 'string' ? resolveRoleLabel(value) : undefined))
    .find(Boolean);

  const resolvedUsername = username || uploadedByUsername;
  const resolvedName =
    name ||
    (typeof uploadedBy === 'string' && !uploadedByUsername ? uploadedBy : undefined);

  const directoryByName = lookupDirectoryUser(
    directory,
    resolvedUsername || resolvedName,
  );
  if (directoryByName) {
    return {
      name: directoryByName.name || resolvedName,
      username: directoryByName.username || resolvedUsername,
      roleLabel: directoryByName.roleLabel || roleLabel || resolveRoleLabelFromModule(moduleName),
    };
  }

  return {
    username: resolvedUsername,
    name: resolvedName,
    roleLabel: roleLabel || resolveRoleLabelFromModule(moduleName),
  };
}

function resolveRoleLabelFromModule(moduleName?: string): string | undefined {
  const key = (moduleName || '').trim().toLowerCase();
  const map: Record<string, string> = {
    'health & safety': 'QAQC Site Engineer',
    'quality status': 'QAQC Site Engineer',
    'site photos': 'Site Engineer',
    invoicing: 'Billing Site Engineer',
    'cash flow': 'Billing Site Engineer',
    'contract values': 'Billing Site Engineer',
    'cost performance': 'Billing Site Engineer',
    'budget performance': 'Billing Site Engineer',
    'contract performance': 'Billing Site Engineer',
    'planned earned value': 'Billing Site Engineer',
    'monthly scope': 'Site Engineer',
    'manpower management': 'Team Leader',
    'project dates': 'Team Leader',
    correspondence: 'Team Leader',
    'drawing register': 'Team Leader',
    dpr: 'Site Engineer',
    wpr: 'Team Leader',
  };
  return map[key];
}

export function isGenericActorDisplay(
  displayName?: string,
  roleLabel?: string,
): boolean {
  return isGenericActorName(displayName, roleLabel);
}

export function resolveActorDisplayFromRecord(
  row: Record<string, unknown>,
  moduleName?: string,
  directory: DirectoryUser[] = [],
): { displayName: string; roleLabel?: string; username?: string } {
  const fields = pickActorFieldsFromRecord(row, moduleName, directory);
  const displayName = resolveActorDisplayName({
    name: fields.name,
    username: fields.username,
    roleLabel: fields.roleLabel,
  });
  return {
    displayName,
    roleLabel: fields.roleLabel,
    username: fields.username,
  };
}
