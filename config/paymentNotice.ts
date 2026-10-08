import { UserRole } from '../types';

/**
 * Payment-due / service-continuity notice shown in the app header.
 * Override without a code change via `.env`:
 *   VITE_PAYMENT_NOTICE_ENABLED=false
 *   VITE_PAYMENT_PAUSE_DATE=2026-10-15   (YYYY-MM-DD, local date the portal will be paused)
 */
export const PAYMENT_NOTICE = {
  enabled: String(import.meta.env.VITE_PAYMENT_NOTICE_ENABLED ?? 'true').toLowerCase() !== 'false',
  pauseDate: String(import.meta.env.VITE_PAYMENT_PAUSE_DATE ?? '2026-10-10'),
  roles: [UserRole.PMC_HEAD, UserRole.PMC_HEAD_OFFICE, UserRole.COORDINATOR] as UserRole[],
};

/** Whole days from today (local) until the pause date; null when the date is invalid. */
export function daysUntilPortalPause(pauseDate: string = PAYMENT_NOTICE.pauseDate): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pauseDate.trim());
  if (!match) return null;
  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
