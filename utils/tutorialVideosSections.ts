/**
 * Central tutorial-video section keys. Always send these keys to the API —
 * never send display labels like "Meeting Documents".
 */

import { UserRole } from '../types';

export const TUTORIAL_SECTIONS = {
  /** PMC Head / PMC HO / PMC Manager (Coordinator) Overview dashboard */
  overview: 'Overview',
  /** Team Leader Overview — must stay separate from PMC Head `overview` */
  tl_overview: 'Overview',
  projects: 'Projects',
  initialize_project: 'Initialize Project',
  user_management: 'User Management',
  site_progress: 'Site Progress',
  site_photos: 'Site Photos',
  testing_photos: 'Testing Photos',
  project_feedback: 'Project Feedback',
  portfolio: 'Portfolio',
  dpr_review: 'DPR Review',
  wpr_review: 'WPR Review',
  meeting_documents: 'Meeting Documents',
  alerts: 'Alerts',
} as const;

export type TutorialSectionKey = keyof typeof TUTORIAL_SECTIONS;

export const TUTORIAL_SECTION_KEYS = Object.keys(TUTORIAL_SECTIONS) as TutorialSectionKey[];

/**
 * Tutorial Videos upload/list panel (bottom of a page).
 * Uncomment ONE key when you have videos for that module.
 * Watch Tutorial in the page header still appears automatically
 * whenever a ready video exists for that section.
 *
 * Example — show the panel only on Overview:
 *   overview: true,
 */
export const TUTORIAL_VIDEOS_PANEL_ENABLED_SECTIONS: Partial<
  Record<TutorialSectionKey, true>
> = {
  // overview: true,
  // tl_overview: true,
  // projects: true,
  // initialize_project: true,
  // user_management: true,
  // site_progress: true,
  // site_photos: true,
  // testing_photos: true,
  // project_feedback: true,
  // portfolio: true,
  // dpr_review: true,
  // wpr_review: true,
  // meeting_documents: true,
  // alerts: true,
};

export function isTutorialVideosPanelEnabled(section: TutorialSectionKey): boolean {
  return TUTORIAL_VIDEOS_PANEL_ENABLED_SECTIONS[section] === true;
}

export function isTutorialSectionKey(value: string): value is TutorialSectionKey {
  return value in TUTORIAL_SECTIONS;
}

export function tutorialSectionLabel(key: TutorialSectionKey): string {
  return TUTORIAL_SECTIONS[key];
}

/**
 * Map app hash-tab ids → tutorial section keys.
 * Used when wiring from App/Layout without duplicating labels.
 */
export const APP_TAB_TO_TUTORIAL_SECTION: Partial<Record<string, TutorialSectionKey>> = {
  dashboard: 'overview',
  team_projects: 'projects',
  project_init: 'initialize_project',
  user_management: 'user_management',
  execution: 'site_progress',
  site_photos: 'site_photos',
  testing_photos: 'testing_photos',
  project_feedback: 'project_feedback',
  projects: 'portfolio',
  dpr_records: 'dpr_review',
  wpr_records: 'wpr_review',
  meeting_documents: 'meeting_documents',
  alerts: 'alerts',
};

export function resolveTutorialSectionForTab(
  activeTab: string,
  options?: { teamLeadOverview?: boolean },
): TutorialSectionKey | null {
  if (activeTab === 'team_projects' && options?.teamLeadOverview) {
    return 'tl_overview';
  }
  return APP_TAB_TO_TUTORIAL_SECTION[activeTab] ?? null;
}

/**
 * Resolve which tutorial section a role should use for a named screen.
 * Keeps overlapping UI (e.g. Overview) from sharing videos across roles.
 */
export function resolveTutorialSectionForRole(
  screen: 'overview' | 'projects',
  role: UserRole,
): TutorialSectionKey {
  if (screen === 'overview') {
    return role === UserRole.TEAM_LEAD ? 'tl_overview' : 'overview';
  }
  return 'projects';
}

export type TutorialOrdering =
  | 'created_at'
  | '-created_at'
  | 'title'
  | '-title'
  | 'status'
  | '-status';

export const TUTORIAL_ORDERING_OPTIONS: ReadonlyArray<{
  value: TutorialOrdering;
  label: string;
}> = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: '-title', label: 'Title Z–A' },
  { value: 'status', label: 'Status A–Z' },
  { value: '-status', label: 'Status Z–A' },
];

export const TUTORIAL_DEFAULT_PAGE_SIZE = 20;
export const TUTORIAL_MAX_PAGE_SIZE = 100;
export const TUTORIAL_DEFAULT_ORDERING: TutorialOrdering = '-created_at';

export const TUTORIAL_VIDEO_EXTENSIONS = [
  'mp4',
  'mov',
  'webm',
  'avi',
  'mkv',
  'm4v',
] as const;

export function isSupportedTutorialVideoFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf('.');
  if (dot < 0) return false;
  const ext = name.slice(dot + 1);
  return (TUTORIAL_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Soft guidance only — backend remains the final validator.
 * ~146MB uploads have OOMed the Railway web dyno during FFmpeg.
 */
export const TUTORIAL_VIDEO_SOFT_MAX_BYTES = 80 * 1024 * 1024; // 80 MB

/** Matches backend TUTORIAL_VIDEO_MAX_PROCESSING_SEC (default 900). */
export const TUTORIAL_VIDEO_MAX_PROCESSING_SEC = 900;

export function formatTutorialVideoBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
