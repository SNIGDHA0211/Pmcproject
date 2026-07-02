import type { HSERecord, HealthSafetyYtdSummary } from '../services/api';

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const;

export const monthShortLabel = (month: number) =>
  MONTH_OPTIONS.find((item) => item.value === month)?.label.slice(0, 3) ?? `M${month}`;

export const monthYearLabel = (month: number, year: number) => {
  const label = MONTH_OPTIONS.find((item) => item.value === month)?.label ?? `Month ${month}`;
  return `${label} ${year}`;
};

export type HealthSafetyStatusLevel = 'safe' | 'warning' | 'critical';

export interface HealthSafetyStatusBadge {
  level: HealthSafetyStatusLevel;
  label: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export function getHealthSafetyStatus(record: Pick<HSERecord, 'fatalities' | 'minor'>): HealthSafetyStatusBadge {
  if (record.fatalities > 0) {
    return { level: 'critical', label: 'CRITICAL' };
  }
  if (record.minor > 0) {
    return { level: 'warning', label: 'WARNING' };
  }
  return { level: 'safe', label: 'SAFE' };
}

export const statusBadgeClasses: Record<HealthSafetyStatusLevel, string> = {
  safe: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  critical: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
};

export type IncidentMetrics = Pick<
  HSERecord,
  'fatalities' | 'significant' | 'major' | 'minor' | 'nearMiss'
>;

const sumIncidentField = (records: HSERecord[], key: keyof IncidentMetrics): number =>
  records.reduce((total, row) => total + (Number(row[key]) || 0), 0);

export function toIncidentMetrics(
  source: HSERecord | HealthSafetyYtdSummary | IncidentMetrics | null | undefined
): IncidentMetrics {
  return {
    fatalities: source?.fatalities ?? 0,
    significant: source?.significant ?? 0,
    major: source?.major ?? 0,
    minor: source?.minor ?? 0,
    nearMiss: source?.nearMiss ?? 0,
  };
}

export type HealthSafetyTrendPoint = {
  label: string;
  nearMiss: number;
  major: number;
  minor: number;
};

function recordsByMonthForYear(records: HSERecord[], year: number): Map<number, HSERecord> {
  const byMonth = new Map<number, HSERecord>();
  records.forEach((record) => {
    const recordYear = Number(record.year);
    const recordMonth = Number(record.month);
    if (recordYear !== year || recordMonth < 1 || recordMonth > 12) return;
    byMonth.set(recordMonth, record);
  });
  return byMonth;
}

export function buildMonthlyTrendData(records: HSERecord[], year: number): HealthSafetyTrendPoint[] {
  const byMonth = recordsByMonthForYear(records, year);
  return MONTH_OPTIONS.map(({ value }) => {
    const record = byMonth.get(value);
    return {
      label: monthShortLabel(value),
      nearMiss: record?.nearMiss ?? 0,
      major: record?.major ?? 0,
      minor: record?.minor ?? 0,
    };
  });
}

export function buildYearlyTrendData(records: HSERecord[]): HealthSafetyTrendPoint[] {
  const byYear = new Map<number, HealthSafetyTrendPoint>();

  records.forEach((record) => {
    if (!record.year) return;
    const existing = byYear.get(record.year) ?? {
      label: String(record.year),
      nearMiss: 0,
      major: 0,
      minor: 0,
    };
    existing.nearMiss += record.nearMiss;
    existing.major += record.major;
    existing.minor += record.minor;
    byYear.set(record.year, existing);
  });

  return Array.from(byYear.entries())
    .sort(([yearA], [yearB]) => yearA - yearB)
    .map(([, point]) => point);
}

export function buildHealthSafetyYearlyLineTrendData(records: HSERecord[]): HealthSafetyLineTrendPoint[] {
  const byYear = new Map<number, HealthSafetyLineTrendPoint>();

  records.forEach((record) => {
    if (!record.year) return;
    const existing = byYear.get(record.year) ?? {
      label: String(record.year),
      fatalities: 0,
      significant: 0,
      major: 0,
      minor: 0,
      nearMiss: 0,
    };
    existing.fatalities += record.fatalities;
    existing.significant += record.significant;
    existing.major += record.major;
    existing.minor += record.minor;
    existing.nearMiss += record.nearMiss;
    byYear.set(record.year, existing);
  });

  return Array.from(byYear.entries())
    .sort(([yearA], [yearB]) => yearA - yearB)
    .map(([, point]) => point);
}

export type IncidentKpiKey = keyof IncidentMetrics;

export const INCIDENT_KPI_CONFIG: {
  key: IncidentKpiKey;
  label: string;
  shortLabel: string;
  barColor: string;
  textColor: string;
  badgeLabel: string;
  badgeClass: string;
}[] = [
  {
    key: 'fatalities',
    label: 'Fatalities',
    shortLabel: 'Fatalities',
    barColor: 'bg-rose-600',
    textColor: 'text-rose-600',
    badgeLabel: 'CRITICAL',
    badgeClass: 'bg-rose-600 text-white',
  },
  {
    key: 'significant',
    label: 'Significant',
    shortLabel: 'Significant',
    barColor: 'bg-orange-500',
    textColor: 'text-orange-500',
    badgeLabel: 'HIGH',
    badgeClass: 'bg-orange-500 text-white',
  },
  {
    key: 'major',
    label: 'Major',
    shortLabel: 'Major',
    barColor: 'bg-amber-400',
    textColor: 'text-amber-500',
    badgeLabel: 'MEDIUM',
    badgeClass: 'bg-amber-400 text-amber-950',
  },
  {
    key: 'minor',
    label: 'Minor',
    shortLabel: 'Minor',
    barColor: 'bg-yellow-400',
    textColor: 'text-yellow-600',
    badgeLabel: 'MODERATE',
    badgeClass: 'bg-yellow-300 text-yellow-950',
  },
  {
    key: 'nearMiss',
    label: 'Near Miss',
    shortLabel: 'Near Miss',
    barColor: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    badgeLabel: 'GOOD',
    badgeClass: 'bg-emerald-500 text-white',
  },
];

export type SafetyScoreLabel = 'Excellent' | 'Good' | 'Needs Attention' | 'Critical';

export function calculateSafetyScore(
  record: Pick<HSERecord, 'fatalities' | 'significant' | 'major' | 'minor' | 'nearMiss' | 'totalManhours' | 'lossOfManhours'>
): number {
  const totalIncidents =
    record.fatalities + record.significant + record.major + record.minor + record.nearMiss;
  if (record.fatalities > 0) {
    const fatPenalty = Math.min(55, record.fatalities * 2.5);
    const otherPenalty = Math.min(35, (record.significant + record.major) * 0.4 + record.minor * 0.15);
    const nearBonus = Math.min(10, record.nearMiss * 0.15);
    return Math.round(Math.max(0, Math.min(100, 100 - fatPenalty - otherPenalty + nearBonus)));
  }
  if (record.totalManhours > 0) {
    const ltifr = (record.lossOfManhours / record.totalManhours) * 1_000_000;
    const ir = (totalIncidents / record.totalManhours) * 1_000_000;
    const score = 100 - ir * 0.12 - ltifr * 0.08;
    return Math.round(Math.max(0, Math.min(100, score)));
  }
  if (totalIncidents === 0) return 100;
  return Math.round(Math.max(0, 100 - totalIncidents * 1.2));
}

export function getSafetyScoreLabel(score: number): { label: SafetyScoreLabel; tone: string; ring: string } {
  if (score >= 90) return { label: 'Excellent', tone: 'text-emerald-600', ring: 'stroke-emerald-500' };
  if (score >= 75) return { label: 'Good', tone: 'text-blue-600', ring: 'stroke-blue-500' };
  if (score >= 50) return { label: 'Needs Attention', tone: 'text-orange-500', ring: 'stroke-orange-500' };
  return { label: 'Critical', tone: 'text-rose-600', ring: 'stroke-rose-500' };
}

export type HealthSafetyLineTrendPoint = {
  label: string;
  fatalities: number;
  significant: number;
  major: number;
  minor: number;
  nearMiss: number;
};

export function buildHealthSafetyLineTrendData(records: HSERecord[], year: number): HealthSafetyLineTrendPoint[] {
  const byMonth = recordsByMonthForYear(records, year);
  return MONTH_OPTIONS.map(({ value }) => {
    const record = byMonth.get(value);
    return {
      label: monthShortLabel(value),
      fatalities: record?.fatalities ?? 0,
      significant: record?.significant ?? 0,
      major: record?.major ?? 0,
      minor: record?.minor ?? 0,
      nearMiss: record?.nearMiss ?? 0,
    };
  });
}

export function buildHealthSafetyYearOptions(centerYear = new Date().getFullYear()): number[] {
  const current = new Date().getFullYear();
  const end = Math.max(current, centerYear) + 1;
  const start = Math.min(centerYear, current) - 3;
  const years: number[] = [];
  for (let y = start; y <= end; y += 1) {
    years.push(y);
  }
  return years;
}

export function mergeHealthSafetyRecordsByPeriod(records: HSERecord[]): HSERecord[] {
  const map = new Map<string, HSERecord>();
  records.forEach((row) => {
    const month = Number(row.month);
    const year = Number(row.year);
    if (!month || month < 1 || month > 12 || !year) return;
    map.set(`${year}-${month}`, { ...row, month, year });
  });
  return Array.from(map.values()).sort((a, b) => (a.year! - b.year!) || (a.month! - b.month!));
}

export function mergeHealthSafetyRecords(
  records: HSERecord[],
  ...extras: (HSERecord | null | undefined)[]
): HSERecord[] {
  const extrasList = extras.filter((row): row is HSERecord => Boolean(row));
  return mergeHealthSafetyRecordsByPeriod([...records, ...extrasList]);
}

/** Sum monthly HSE rows for the selected calendar year (client-side YTD when API summary is empty). */
export function computeHealthSafetyYtdFromRecords(
  records: HSERecord[],
  year: number
): HealthSafetyYtdSummary {
  const yearRecords = records.filter((row) => Number(row.year) === year);
  return {
    year,
    fatalities: sumIncidentField(yearRecords, 'fatalities'),
    significant: sumIncidentField(yearRecords, 'significant'),
    major: sumIncidentField(yearRecords, 'major'),
    minor: sumIncidentField(yearRecords, 'minor'),
    nearMiss: sumIncidentField(yearRecords, 'nearMiss'),
    totalManhours: yearRecords.reduce((s, r) => s + (Number(r.totalManhours) || 0), 0),
    lossOfManhours: yearRecords.reduce((s, r) => s + (Number(r.lossOfManhours) || 0), 0),
  };
}

const incidentTotal = (summary: Pick<HealthSafetyYtdSummary, IncidentKpiKey>) =>
  summary.fatalities + summary.significant + summary.major + summary.minor + summary.nearMiss;

/** Prefer API YTD summary when populated; otherwise derive from loaded monthly records. */
export function resolveHealthSafetyYtdSummary(
  apiSummary: HealthSafetyYtdSummary | null | undefined,
  records: HSERecord[],
  year: number
): HealthSafetyYtdSummary {
  const fromRecords = computeHealthSafetyYtdFromRecords(records, year);
  if (!apiSummary || Number(apiSummary.year) !== year) {
    return fromRecords;
  }
  if (incidentTotal(apiSummary) === 0 && incidentTotal(fromRecords) > 0) {
    return fromRecords;
  }
  if (incidentTotal(fromRecords) > incidentTotal(apiSummary)) {
    return fromRecords;
  }
  return apiSummary;
}
