import type { BgEntryStatus, BgEntryType, BGEntry, BGSummary } from '../types/bgStatus';

export function unwrapApiData<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export function normalizeBgEntry(row: unknown): BGEntry | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = Number(r.id);
  if (!Number.isFinite(id)) return null;
  const bgTypeRaw = String(r.bg_type ?? r.bgType ?? 'CONTRACTOR').toUpperCase();
  const bg_type: BgEntryType = bgTypeRaw === 'SCL' ? 'SCL' : 'CONTRACTOR';
  const statusRaw = String(r.status ?? 'YET_TO_UPDATE').toUpperCase();
  const status: BgEntryStatus =
    statusRaw === 'UPDATED'
      ? 'UPDATED'
      : statusRaw === 'NOT_UPDATED'
        ? 'NOT_UPDATED'
        : 'YET_TO_UPDATE';

  return {
    id,
    bg_type,
    bg_name: String(r.bg_name ?? r.bgName ?? '').trim(),
    due_date: String(r.due_date ?? r.dueDate ?? ''),
    updated_date:
      r.updated_date != null && String(r.updated_date).trim()
        ? String(r.updated_date)
        : r.updatedDate != null && String(r.updatedDate).trim()
          ? String(r.updatedDate)
          : null,
    status,
    remarks: String(r.remarks ?? ''),
    contractor_name: String(r.contractor_name ?? r.contractorName ?? '').trim() || undefined,
  };
}

export function normalizeBgSummary(raw: unknown): BGSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    total_bg: Number(r.total_bg ?? r.totalBg ?? 0) || 0,
    updated: Number(r.updated ?? 0) || 0,
    yet_to_update: Number(r.yet_to_update ?? r.yetToUpdate ?? 0) || 0,
    not_updated: Number(r.not_updated ?? r.notUpdated ?? 0) || 0,
    compliance_percentage:
      Number(r.compliance_percentage ?? r.compliancePercentage ?? 0) || 0,
  };
}

export function normalizeBgStatusBundle(raw: unknown): import('../types/bgStatus').BgStatusBundle {
  const data = unwrapApiData<Record<string, unknown>>(raw);
  const contractor_bg = Array.isArray(data?.contractor_bg)
    ? data.contractor_bg.map(normalizeBgEntry).filter((e): e is BGEntry => e != null)
    : [];
  const scl_bg = Array.isArray(data?.scl_bg)
    ? data.scl_bg.map(normalizeBgEntry).filter((e): e is BGEntry => e != null)
    : [];
  return {
    contractor_bg,
    scl_bg,
    bg_summary: normalizeBgSummary(data?.bg_summary ?? data?.bgSummary),
  };
}

export function formatBgDisplayDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.toLocaleString('en-GB', { month: 'short' });
  const year = parsed.getFullYear();
  return `${day} ${month} ${year}`;
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

const STATUS_PRIORITY: Record<BgEntryStatus, number> = {
  NOT_UPDATED: 3,
  YET_TO_UPDATE: 2,
  UPDATED: 1,
};

export function worstBgStatus(entries: BGEntry[]): BgEntryStatus | null {
  if (!entries.length) return null;
  return entries.reduce<BgEntryStatus>((worst, entry) => {
    return STATUS_PRIORITY[entry.status] > STATUS_PRIORITY[worst] ? entry.status : worst;
  }, entries[0].status);
}

export function bgStatusLabel(status: BgEntryStatus | null | undefined): string {
  if (!status) return 'PENDING';
  if (status === 'UPDATED') return 'UPDATED';
  if (status === 'NOT_UPDATED') return 'NOT UPDATED';
  return 'YET TO UPDATE';
}

export function bgStatusToneClasses(
  status: BgEntryStatus | null | undefined,
  isDarkTheme: boolean,
): string {
  const s = status ?? 'YET_TO_UPDATE';
  if (s === 'UPDATED') {
    return isDarkTheme
      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
      : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  }
  if (s === 'NOT_UPDATED') {
    return isDarkTheme
      ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
      : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
  }
  return isDarkTheme
    ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
}

export function derivePartyBgPill(entries: BGEntry[]) {
  if (!entries.length) {
    return {
      label: 'PENDING',
      status: null as BgEntryStatus | null,
      count: 0,
      dueDate: null as string | null,
      updatedDate: null as string | null,
      displayDate: null as string | null,
      dateKind: 'due' as 'due' | 'updated',
    };
  }
  const status = worstBgStatus(entries);
  const hasDue = (e: BGEntry) => Boolean(e.due_date?.trim());
  const nearestDue =
    [...entries]
      .filter(hasDue)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]?.due_date ?? null;
  const latestUpdated =
    [...entries]
      .filter((e) => e.updated_date?.trim())
      .sort(
        (a, b) =>
          new Date(b.updated_date!).getTime() - new Date(a.updated_date!).getTime(),
      )[0]?.updated_date ?? null;

  const displayDate =
    status === 'UPDATED' && latestUpdated ? latestUpdated : nearestDue ?? latestUpdated;
  const dateKind: 'due' | 'updated' =
    status === 'UPDATED' && latestUpdated ? 'updated' : 'due';

  return {
    label: bgStatusLabel(status),
    status,
    count: entries.length,
    dueDate: nearestDue,
    updatedDate: latestUpdated,
    displayDate,
    dateKind,
  };
}

export function formatPartyBgTooltip(entries: BGEntry[], partyLabel: string): string {
  if (!entries.length) return `${partyLabel}: No bank guarantee on file`;
  return entries
    .map((e) => {
      const due = e.due_date?.trim() ? `Due ${formatBgDisplayDate(e.due_date)}` : 'Due —';
      const upd = e.updated_date?.trim()
        ? ` · Upd ${formatBgDisplayDate(e.updated_date)}`
        : '';
      return `${e.bg_name}: ${due}${upd} (${bgStatusLabel(e.status)})`;
    })
    .join('\n');
}

export const emptyBgStatusBundle = (): import('../types/bgStatus').BgStatusBundle => ({
  contractor_bg: [],
  scl_bg: [],
  bg_summary: null,
});
