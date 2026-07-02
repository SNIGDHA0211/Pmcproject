import { plantMachineryApi } from '../services/api';
import { toLocalDateIso } from './format';

export type MachineryRow = {
  srNo: number;
  particular: string;
  unit: string;
  qty: string;
  remark: string;
  status?: string;
};

export type MachinerySummary = {
  totalMachines: number;
  workingMachines: number;
  notWorkingMachines: number;
};

export const PLANT_MACHINERY_UPDATED_EVENT = 'plant-machinery-updated';

export function parseMachineryQty(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  const parsed = parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function normalizeMachineryStatus(value: unknown): string {
  const raw = String(value ?? 'Working').trim();
  if (!raw) return 'Working';
  const lower = raw.toLowerCase();
  if (lower === 'working' || lower === 'operational') return 'Working';
  if (lower === 'under maintenance' || lower === 'maintenance') return 'Under Maintenance';
  if (lower === 'not available' || lower === 'not working' || lower === 'breakdown' || lower === 'idle') {
    return 'Not Available';
  }
  return raw;
}

export function isWorkingMachineryStatus(status?: string): boolean {
  return normalizeMachineryStatus(status) === 'Working';
}

export function mapReportItemsToMachineryRows(items: Record<string, unknown>[]): MachineryRow[] {
  return items.map((item, index) => ({
    srNo: Number(item.sr_no ?? item.srNo ?? index + 1),
    particular: String(item.particular ?? item.name ?? ''),
    unit: String(item.unit || 'No'),
    qty: String(parseMachineryQty(item.qty ?? item.quantity ?? item.Qty)),
    remark: String(item.remark ?? ''),
    status: normalizeMachineryStatus(item.status),
  }));
}

/** Sum quantities from visible machinery rows (matches table totals). */
export function computeMachinerySummary(rows: MachineryRow[]): MachinerySummary {
  let totalMachines = 0;
  let workingMachines = 0;
  let notWorkingMachines = 0;

  for (const row of rows) {
    const qty = parseMachineryQty(row.qty);
    if (qty <= 0) continue;

    totalMachines += qty;
    if (isWorkingMachineryStatus(row.status)) {
      workingMachines += qty;
    } else {
      notWorkingMachines += qty;
    }
  }

  return { totalMachines, workingMachines, notWorkingMachines };
}

export function readReportSummary(report: Record<string, unknown>): MachinerySummary | null {
  const total = report.total_machines ?? report.totalMachines;
  const working = report.working_machines ?? report.workingMachines ?? report.working;
  const notWorking = report.not_working_machines ?? report.notWorkingMachines ?? report.not_working;

  if (
    [total, working, notWorking].every(
      (v) => v === undefined || v === null || v === ''
    )
  ) {
    return null;
  }

  return {
    totalMachines: parseMachineryQty(total),
    workingMachines: parseMachineryQty(working),
    notWorkingMachines: parseMachineryQty(notWorking),
  };
}

export function dispatchPlantMachineryUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PLANT_MACHINERY_UPDATED_EVENT));
  }
}

function extractMachineryReportList(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  const payload = data as Record<string, unknown>;
  if (Array.isArray(payload.results)) return payload.results as Record<string, unknown>[];
  if (Array.isArray(payload.data)) return payload.data as Record<string, unknown>[];
  return [];
}

/** Normalize report_date / reportDate to YYYY-MM-DD for comparisons. */
export function normalizeMachineryReportDateIso(report: Record<string, unknown>): string {
  const raw = String(report.report_date ?? report.reportDate ?? '').trim();
  if (!raw) return '';

  const isoPrefix = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoPrefix)) return isoPrefix;

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return toLocalDateIso(parsed);

  return isoPrefix;
}

export function getMachineryReportUpdatedAtMs(report: Record<string, unknown>): number {
  const raw = report.updated_at ?? report.updatedAt ?? report.submitted_at ?? report.submittedAt ?? report.created_at ?? report.createdAt;
  if (!raw) return 0;
  const parsed = new Date(String(raw));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export function getMachineryReportUpdatedAtIso(report: Record<string, unknown>): string {
  const raw =
    report.updated_at ??
    report.updatedAt ??
    report.submitted_at ??
    report.submittedAt ??
    report.created_at ??
    report.createdAt;
  return raw ? String(raw) : '';
}

/**
 * Pick the daily report to show on the dashboard:
 * - Prefer today's report (most recently updated if duplicates exist)
 * - Otherwise the latest report_date on or before today (ignore future-dated entries)
 */
export function pickDailyMachineryReport(
  reports: Record<string, unknown>[],
  todayIso: string
): { report: Record<string, unknown>; isToday: boolean } | null {
  if (!reports.length) return null;

  const eligible = reports
    .map((report) => ({
      report,
      dateIso: normalizeMachineryReportDateIso(report),
      updatedAtMs: getMachineryReportUpdatedAtMs(report),
    }))
    .filter((entry) => entry.dateIso && entry.dateIso <= todayIso);

  if (!eligible.length) return null;

  eligible.sort((a, b) => {
    if (a.dateIso !== b.dateIso) return b.dateIso.localeCompare(a.dateIso);
    return b.updatedAtMs - a.updatedAtMs;
  });

  const best = eligible[0];
  return { report: best.report, isToday: best.dateIso === todayIso };
}

async function resolveMachineryReportWithItems(
  report: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const items = report.machinery_items ?? report.items;
  const hasItems = Array.isArray(items) && items.length > 0;
  const reportId = report.id ?? report.pk;

  if (hasItems || reportId === undefined || reportId === null) {
    return report;
  }

  try {
    const detailRes = await plantMachineryApi.getReport(reportId as string | number);
    const detail = (detailRes.data as Record<string, unknown>)?.data ?? detailRes.data;
    if (detail && typeof detail === 'object') {
      return detail as Record<string, unknown>;
    }
  } catch {
    /* use list payload */
  }

  return report;
}

export { extractMachineryReportList, resolveMachineryReportWithItems };

/** Latest plant & machinery rows for management-report export. */
export async function fetchLatestMachineryRows(
  projectName: string,
  _roleParam?: string
): Promise<MachineryRow[]> {
  if (!projectName.trim()) return [];

  const today = toLocalDateIso();

  try {
    const response = await plantMachineryApi.getReports({
      project_name: projectName,
      report_date_lte: today,
      ordering: '-report_date',
    });
    const picked = pickDailyMachineryReport(extractMachineryReportList(response.data), today);
    if (!picked) return [];

    const reportWithItems = await resolveMachineryReportWithItems(picked.report);
    const items = (reportWithItems.machinery_items ?? reportWithItems.items ?? []) as Record<
      string,
      unknown
    >[];
    return mapReportItemsToMachineryRows(items).filter((row) => parseMachineryQty(row.qty) > 0);
  } catch {
    return [];
  }
}
