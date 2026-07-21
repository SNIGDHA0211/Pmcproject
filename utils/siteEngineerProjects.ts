import type { Project, User } from '../types';
import { UserRole } from '../types';
import { userMatchesAssignee } from './roleProjectAssignments';

export function getSiteEngineerProjects(projects: Project[], user: User): Project[] {
  return projects.filter((p) =>
    (p.siteEngineerIds ?? []).some((id) => userMatchesAssignee(user, id)),
  );
}

export function primarySiteEngineerProject(projects: Project[], user: User): string | null {
  const assigned = getSiteEngineerProjects(projects, user);
  return assigned[0]?.title?.trim() || null;
}

export function isSiteEngineerRole(role: UserRole): boolean {
  return role === UserRole.SITE_ENGINEER;
}

export const SITE_ENGINEER_NAV_IDS = [
  'site_engineer_dashboard',
  'execution',
  'my_scopes',
  'manpower_management',
  'site_photos',
  'machinery_list',
  'dpr_records',
  'wpr_records',
  'project_feedback',
] as const;

export const SITE_ENGINEER_NAV_LABELS: Record<string, string> = {
  site_engineer_dashboard: 'Dashboard',
  execution: 'Site Progress',
  my_scopes: 'Monthly Scope',
  manpower_management: 'Manpower Management',
  site_photos: 'Site Photos',
  machinery_list: 'Plant Machinery',
  dpr_records: 'DPR',
  wpr_records: 'WPR',
  project_feedback: 'Project Feedback',
};

export const SITE_ENGINEER_QUICK_LINKS: { tab: string; label: string; description: string }[] = [
  { tab: 'execution', label: 'Site Progress', description: 'Physical progress tracking' },
  { tab: 'my_scopes', label: 'Monthly Scope', description: 'Assigned scope items' },
  { tab: 'manpower_management', label: 'Manpower', description: 'Workforce records' },
  { tab: 'site_photos', label: 'Site Photos', description: 'Upload & gallery' },
  { tab: 'machinery_list', label: 'Plant Machinery', description: 'Equipment status' },
  { tab: 'dpr_records', label: 'DPR', description: 'Daily progress reports' },
  { tab: 'wpr_records', label: 'WPR', description: 'Weekly progress reports' },
];
