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
  // Prefer backend contractor_summary; if missing, use first meaningful contractor row.
  const contractorSource =
    bundle.contractorSummary ??
    bundle.contractors.find(
      (row) =>
        row.plannedValue !== 0 || row.actualValue !== 0 || row.collection !== 0,
    ) ??
    null;

  return {
    projectName: bundle.projectName,
    month: bundle.month,
    year: bundle.year,
    scl: pvaRecordToPlannedEarnedMetrics(bundle.scl),
    contractor: pvaRecordToPlannedEarnedMetrics(contractorSource),
  };
}

/** True when the project/period bundle has any displayable PVA signal. */
export function pvaBundleHasDisplayData(bundle: PvaProjectBundle | null | undefined): boolean {
  if (!bundle) return false;
  if (pvaRecordToPlannedEarnedMetrics(bundle.scl)) return true;
  if (pvaRecordToPlannedEarnedMetrics(bundle.contractorSummary)) return true;
  return bundle.contractors.some(
    (row) =>
      row.plannedValue !== 0 || row.actualValue !== 0 || row.collection !== 0,
  );
}
