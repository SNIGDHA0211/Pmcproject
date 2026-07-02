import type { DrawingMonthlyRecord } from '../types';
import { MONTH_OPTIONS, monthShortLabel, monthYearLabel } from './healthSafety';

export { MONTH_OPTIONS, monthShortLabel, monthYearLabel };

export function buildDrawingYearOptions(centerYear = new Date().getFullYear()): number[] {
  return Array.from({ length: 4 }, (_, index) => centerYear - 2 + index);
}

export function computeDrawingVariance(submitted: number, approved: number): number {
  return Math.max(0, submitted - approved);
}

export function getApprovalRateTone(rate: number): string {
  if (rate >= 90) return 'bg-emerald-500';
  if (rate >= 75) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getApprovalRateTextTone(rate: number): string {
  if (rate >= 90) return 'text-[#059669]';
  if (rate >= 75) return 'text-[#F97316]';
  return 'text-[#E11D48]';
}

export type DrawingTrackingLevel = 'onTrack' | 'attention' | 'atRisk';

export const drawingTrackingBadgeClasses: Record<DrawingTrackingLevel, string> = {
  onTrack: 'bg-emerald-100 text-emerald-800',
  attention: 'bg-amber-100 text-amber-800',
  atRisk: 'bg-rose-100 text-rose-800',
};

export function getDrawingTrackingStatus(approvalRate: number): {
  level: DrawingTrackingLevel;
  label: string;
} {
  if (approvalRate >= 85) return { level: 'onTrack', label: 'ON TRACK' };
  if (approvalRate >= 70) return { level: 'attention', label: 'ATTENTION' };
  return { level: 'atRisk', label: 'AT RISK' };
}

export type DrawingTrendPoint = {
  label: string;
  submittedDrawings: number;
  approvedDrawings: number;
};

export function buildDrawingMonthlyTrendData(records: DrawingMonthlyRecord[], year: number): DrawingTrendPoint[] {
  return records
    .filter((record) => record.year === year && record.month)
    .sort((a, b) => a.month - b.month)
    .map((record) => ({
      label: monthShortLabel(record.month),
      submittedDrawings: record.submittedDrawings,
      approvedDrawings: record.approvedDrawings,
    }));
}

export function validateDrawingFormInput(values: {
  submittedDrawings: number;
  approvedDrawings: number;
}): string | null {
  if (values.submittedDrawings < 0 || values.approvedDrawings < 0) {
    return 'Values cannot be negative.';
  }
  if (values.approvedDrawings > values.submittedDrawings) {
    return 'Approved drawings cannot exceed submitted drawings.';
  }
  return null;
}
