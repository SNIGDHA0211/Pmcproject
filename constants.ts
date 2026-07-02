
import { ProjectStatus, UserRole } from './types';

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  [ProjectStatus.CREATED]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ProjectStatus.ASSIGNED]: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  [ProjectStatus.IN_PROGRESS]: 'bg-amber-100 text-amber-700 border-amber-200',
  [ProjectStatus.SUBMITTED]: 'bg-purple-100 text-purple-700 border-purple-200',
  [ProjectStatus.REVIEWED]: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  [ProjectStatus.APPROVED]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [ProjectStatus.REJECTED]: 'bg-rose-100 text-rose-700 border-rose-200',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.PMC_HEAD]: 'PMC Head',
  [UserRole.CEO]: 'CEO',
  [UserRole.COORDINATOR]: 'Coordinator',
  [UserRole.TEAM_LEAD]: 'Team Leader',
  [UserRole.SITE_ENGINEER]: 'Site Engineer',
  [UserRole.BILLING_SITE_ENGINEER]: 'Billing Site Engineer',
  [UserRole.QAQC_SITE_ENGINEER]: 'QAQC Site Engineer',
};

export const WORKFLOW_STEPS = [
  ProjectStatus.CREATED,
  ProjectStatus.ASSIGNED,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.SUBMITTED,
  ProjectStatus.REVIEWED,
  ProjectStatus.APPROVED,
];
