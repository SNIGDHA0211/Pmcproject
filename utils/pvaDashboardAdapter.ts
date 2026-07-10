import type { PlannedEarnedByPeriodResponse, PlannedEarnedPartyMetrics } from '../services/api';
import type { PvaProjectBundle, PvaRecord } from '../types/plannedVsActual';

/** Map backend Planned vs Actual record → dashboard card metrics (display only). */
export function pvaRecordToPlannedEarnedMetrics(
  record: PvaRecord | null | undefined,
): PlannedEarnedPartyMetrics | null {
  if (!record) return null;

  const hasSignal =
    record.id != null ||
    record.plannedValue !== 0 ||
    record.actualValue !== 0 ||
    record.collection !== 0;
  if (!hasSignal) return null;

  return {
    id: record.id != null ? Number(record.id) : undefined,
    plannedValue: record.plannedValue,
    earnedValue: record.actualValue,
    variance: record.difference,
    difference: record.difference,
    spi: record.achievementPct,
    performancePercentage: record.achievementPct,
    collection: record.collection,
    collectionPct: record.collectionPct,
    varianceStatus: record.varianceStatus,
  };
}

export function pvaBundleToPlannedEarnedPeriod(
  bundle: PvaProjectBundle,
): PlannedEarnedByPeriodResponse {
  return {
    projectName: bundle.projectName,
    month: bundle.month,
    year: bundle.year,
    scl: pvaRecordToPlannedEarnedMetrics(bundle.scl),
    contractor: pvaRecordToPlannedEarnedMetrics(bundle.contractorSummary),
  };
}
