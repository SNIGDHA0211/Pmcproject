import type { HSERecord } from '../services/api';

/** Resolved man days (#2): server value or avg daily × working days. */
export function resolveManDaysWorked(record: HSERecord): number {
  if (record.manDaysWorked > 0) return record.manDaysWorked;
  return (record.averageDailyManpower ?? 0) * (record.workingDays ?? 0);
}

/** Resolved man hours (#3): server value, legacy total, or man days × 8. */
export function resolveManHoursWorked(record: HSERecord): number {
  if (record.manHoursWorked > 0) return record.manHoursWorked;
  if (record.totalManhours > 0 && record.workingDays > 0) return record.totalManhours;
  return resolveManDaysWorked(record) * 8;
}

/** Resolved medical checkup total (#13): server value or workers + staff. */
export function resolveMedicalCheckupTotal(record: HSERecord): number {
  if (record.medicalCheckupTotal > 0) return record.medicalCheckupTotal;
  return (record.medicalCheckupWorkers ?? 0) + (record.medicalCheckupStaff ?? 0);
}

export type HseScorecardItem = {
  srNo: number;
  label: string;
  shortLabel: string;
  getValue: (record: HSERecord) => number;
  decimals?: number;
};

/** Client HSE monthly scorecard items 1–13. */
export const HSE_CLIENT_SCORECARD: HseScorecardItem[] = [
  {
    srNo: 1,
    label: 'Average Daily Manpower (Workers + Staff)',
    shortLabel: 'Avg Daily MP',
    getValue: (r) => r.averageDailyManpower ?? 0,
    decimals: 2,
  },
  {
    srNo: 2,
    label: 'Man Days Worked (Workers + Staff)',
    shortLabel: 'Man Days',
    getValue: (r) => resolveManDaysWorked(r),
    decimals: 2,
  },
  {
    srNo: 3,
    label: 'Man Hrs Worked (Workers + Staff)',
    shortLabel: 'Man Hrs',
    getValue: (r) => resolveManHoursWorked(r),
    decimals: 2,
  },
  {
    srNo: 4,
    label: 'Reportable Accident (LTI)',
    shortLabel: 'LTI',
    getValue: (r) => r.reportableAccidentLti ?? 0,
  },
  {
    srNo: 5,
    label: 'Dangerous Occurrences',
    shortLabel: 'Dangerous Occ.',
    getValue: (r) => r.dangerousOccurrences ?? 0,
  },
  {
    srNo: 6,
    label: 'First Aid Incidence',
    shortLabel: 'First Aid',
    getValue: (r) => r.firstAidCases ?? 0,
  },
  {
    srNo: 6.1,
    label: 'Medical Treatment Case',
    shortLabel: 'Medical Tx',
    getValue: (r) => r.medicalTreatmentCases ?? 0,
  },
  {
    srNo: 7,
    label: 'Near Miss',
    shortLabel: 'Near Miss',
    getValue: (r) => r.nearMiss ?? 0,
  },
  {
    srNo: 8,
    label: 'Utility Damage Incidence',
    shortLabel: 'Utility Damage',
    getValue: (r) => r.utilityDamage ?? 0,
  },
  {
    srNo: 9,
    label: 'Man Hours Lost',
    shortLabel: 'Loss Manhrs',
    getValue: (r) => r.lossOfManhours ?? 0,
    decimals: 2,
  },
  {
    srNo: 10,
    label: 'Job Specific Training (Internal) — Count',
    shortLabel: 'Int. Training #',
    getValue: (r) => r.internalTrainingCount ?? 0,
  },
  {
    srNo: 10.1,
    label: 'Job Specific Training (Internal) — Hrs',
    shortLabel: 'Int. Training Hrs',
    getValue: (r) => r.internalTrainingHours ?? 0,
    decimals: 2,
  },
  {
    srNo: 11,
    label: 'External Training — Count',
    shortLabel: 'Ext. Training #',
    getValue: (r) => r.externalTrainingCount ?? 0,
  },
  {
    srNo: 11.1,
    label: 'External Training — Hrs',
    shortLabel: 'Ext. Training Hrs',
    getValue: (r) => r.externalTrainingHours ?? 0,
    decimals: 2,
  },
  {
    srNo: 12,
    label: 'Mock Drills',
    shortLabel: 'Mock Drills',
    getValue: (r) => r.mockDrills ?? 0,
  },
  {
    srNo: 13,
    label: 'Medical Checkup — Workers',
    shortLabel: 'Med. Workers',
    getValue: (r) => r.medicalCheckupWorkers ?? 0,
  },
  {
    srNo: 13.1,
    label: 'Medical Checkup — Staff',
    shortLabel: 'Med. Staff',
    getValue: (r) => r.medicalCheckupStaff ?? 0,
  },
  {
    srNo: 13.2,
    label: 'Medical Checkup — Total',
    shortLabel: 'Med. Total',
    getValue: (r) => resolveMedicalCheckupTotal(r),
  },
];

export function formatHseScorecardValue(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '0';
  if (decimals > 0) {
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }
  return Math.round(value).toLocaleString('en-IN');
}

export function hseScorecardRowForExport(record: HSERecord): unknown[] {
  return HSE_CLIENT_SCORECARD.map((item) =>
    formatHseScorecardValue(item.getValue(record), item.decimals ?? 0),
  );
}

export const HSE_SCORECARD_EXPORT_HEADERS = HSE_CLIENT_SCORECARD.map(
  (item) => `${item.srNo}. ${item.shortLabel}`,
);
