import type { ProjectQualityStatusRecord } from '../types';
import {
  getCompletionRate,
  getQualityPerformanceStatus,
  monthYearLabel,
  type QualityPerformanceStatus,
} from './qualityStatus';

/** Compact quality snapshot for executive overview — same fields as Project Quality Status. */
export interface ExecutiveQualitySnapshot {
  periodLabel: string;
  testsRequired: number;
  testsConducted: number;
  shortfall: number;
  testsPassed: number;
  testsFailed: number;
  qualityPerformancePct: number;
  completionRatePct: number;
  status: QualityPerformanceStatus;
  hasData: boolean;
}

export function buildExecutiveQualitySnapshot(
  record: ProjectQualityStatusRecord | null | undefined,
): ExecutiveQualitySnapshot | null {
  if (!record) return null;

  const testsRequired = Number(record.testsRequired) || 0;
  const testsConducted = Number(record.testsConducted) || 0;
  const testsPassed = Number(record.testsPassed) || 0;
  const testsFailed =
    Number(record.testsFailed) || Math.max(0, testsConducted - testsPassed);
  const shortfall =
    Number(record.shortfall) || Math.max(0, testsRequired - testsConducted);
  const qualityPerformancePct = Math.min(
    100,
    Math.max(0, Number(record.qualityPerformance) || 0),
  );
  const hasData =
    testsRequired > 0 ||
    testsConducted > 0 ||
    testsPassed > 0 ||
    qualityPerformancePct > 0;

  if (!hasData) return null;

  return {
    periodLabel: monthYearLabel(record.month, record.year),
    testsRequired,
    testsConducted,
    shortfall,
    testsPassed,
    testsFailed,
    qualityPerformancePct,
    completionRatePct: Math.round(getCompletionRate(testsConducted, testsRequired)),
    status: getQualityPerformanceStatus(qualityPerformancePct),
    hasData: true,
  };
}

export const EXECUTIVE_QUALITY_FORMULAS = {
  performance: 'Quality performance = (Tests passed ÷ Tests conducted) × 100',
  shortfall: 'Shortfall = Tests required − Tests conducted',
  completion: 'Completion rate = (Tests conducted ÷ Tests required) × 100',
} as const;
