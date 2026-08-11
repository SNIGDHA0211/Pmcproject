/** Cross-module “Back to overview / previous section” return context. */

export type NavReturnContext = {
  tab: string;
  /** Short label for the Back button, e.g. "Overview" */
  label?: string;
};

/** Friendly names for Back button copy. */
export const NAV_RETURN_TAB_LABELS: Record<string, string> = {
  dashboard: 'Overview',
  site_engineer_dashboard: 'Overview',
  team_projects: 'Overview',
  my_scopes: 'My Scopes',
  projects: 'Portfolio',
  alerts: 'Alerts',
  project_init: 'Initialize Project',
  execution: 'Site Progress',
  financial_management: 'Financial',
  site_photos: 'Site Photos',
  testing_photos: 'Testing Photos',
  manpower_management: 'Manpower',
  machinery_list: 'Plant Machinery',
  dpr_records: 'DPR Review',
  wpr_records: 'WPR Review',
  monthly_scope: 'Monthly Scope',
  meeting_documents: 'Meeting Documents',
  project_feedback: 'Project Feedback',
  user_management: 'User Management',
};

export function navReturnLabel(ctx: NavReturnContext | null | undefined): string {
  if (!ctx?.tab) return 'Back';
  return ctx.label || NAV_RETURN_TAB_LABELS[ctx.tab] || 'Back';
}

export function makeNavReturn(tab: string, label?: string): NavReturnContext {
  return { tab, label: label || NAV_RETURN_TAB_LABELS[tab] };
}
