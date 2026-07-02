import type { ProjectQualityStatusRecord } from '../types';
import { MONTH_OPTIONS, monthShortLabel, monthYearLabel } from './healthSafety';

export { MONTH_OPTIONS, monthShortLabel, monthYearLabel };

export type QualityPerformanceLevel = 'excellent' | 'good' | 'attention' | 'critical';

export interface QualityPerformanceStatus {
  level: QualityPerformanceLevel;
  label: 'EXCELLENT' | 'GOOD' | 'NEEDS ATTENTION' | 'CRITICAL';
  emoji: string;
}

export function getQualityPerformanceStatus(performance: number): QualityPerformanceStatus {
  if (performance >= 95) {
    return { level: 'excellent', label: 'EXCELLENT', emoji: '🟢' };
  }
  if (performance >= 85) {
    return { level: 'good', label: 'GOOD', emoji: '🟡' };
  }
  if (performance >= 70) {
    return { level: 'attention', label: 'NEEDS ATTENTION', emoji: '🟠' };
  }
  return { level: 'critical', label: 'CRITICAL', emoji: '🔴' };
}

export const qualityStatusBadgeClasses: Record<QualityPerformanceLevel, string> = {
  excellent: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  good: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  attention: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  critical: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
};

/** Pill badges for compact quality performance panel */
export const qualityPerformanceSummaryBadge: Record<QualityPerformanceLevel, string> = {
  excellent: 'bg-emerald-100 text-emerald-800',
  good: 'bg-emerald-100 text-emerald-800',
  attention: 'bg-amber-100 text-amber-800',
  critical: 'bg-rose-100 text-rose-800',
};

export function getCompletionRate(testsConducted: number, testsRequired: number): number {
  if (testsRequired <= 0) return 0;
  return (testsConducted / testsRequired) * 100;
}

export function getShortfallAccent(shortfall: number): string {
  return shortfall === 0 ? 'text-[#059669]' : 'text-[#F97316]';
}

export function getQualityPerformanceBarTone(performance: number): string {
  if (performance >= 90) return 'bg-emerald-500';
  if (performance >= 75) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getQualityPerformanceTextTone(performance: number): string {
  if (performance >= 90) return 'text-[#059669]';
  if (performance >= 75) return 'text-[#F97316]';
  return 'text-[#E11D48]';
}

export type QualityTrendPoint = {
  label: string;
  testsRequired: number;
  testsConducted: number;
};

export function buildQualityMonthlyTrendData(
  records: ProjectQualityStatusRecord[],
  year: number
): QualityTrendPoint[] {
  return records
    .filter((record) => record.year === year && record.month)
    .sort((a, b) => a.month - b.month)
    .map((record) => ({
      label: monthShortLabel(record.month),
      testsRequired: record.testsRequired,
      testsConducted: record.testsConducted,
    }));
}

export function buildQualityYearOptions(centerYear = new Date().getFullYear()): number[] {
  return Array.from({ length: 4 }, (_, index) => centerYear - 2 + index);
}

/** tests_failed = tests_conducted − tests_passed */
export function computeTestsFailed(testsConducted: number, testsPassed: number): number {
  return Math.max(0, testsConducted - testsPassed);
}

export function validateQualityFormInput(values: {
  testsRequired: number;
  testsConducted: number;
  testsPassed: number;
}): string | null {
  if (values.testsRequired < 0 || values.testsConducted < 0 || values.testsPassed < 0) {
    return 'Values cannot be negative.';
  }
  if (values.testsPassed > values.testsConducted) {
    return 'Tests passed cannot exceed tests conducted.';
  }
  if (values.testsConducted > values.testsRequired) {
    return 'Warning: tests conducted exceeds tests required.';
  }
  return null;
}
