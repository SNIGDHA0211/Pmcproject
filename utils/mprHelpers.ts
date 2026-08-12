import type { MprReportStatus } from '../types/mpr';

export function formatMprMonthLabel(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function currentMprMonth(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function isValidMprMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

export function mprStatusLabel(status: MprReportStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'generating':
      return 'Generating';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
}

export function mprStatusClasses(status: MprReportStatus, isDark: boolean): string {
  switch (status) {
    case 'completed':
      return isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800';
    case 'generating':
      return isDark ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-800';
    case 'failed':
      return isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-800';
    case 'archived':
      return isDark ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-200 text-slate-600';
    default:
      return isDark ? 'bg-indigo-500/20 text-indigo-200' : 'bg-indigo-50 text-indigo-700';
  }
}

export function formatMprDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function displayValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((v) => displayValue(v)).filter((s) => s !== '—').join(', ') || '—';
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v != null && v !== '',
    );
    if (entries.length <= 4) {
      return entries.map(([k, v]) => `${humanizeKey(k)}: ${displayValue(v)}`).join(' · ') || '—';
    }
    return `${entries.length} fields`;
  }
  return String(value);
}

export function formatInr(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return displayValue(value);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function monthOptions(count = 24): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    out.push({ value, label: formatMprMonthLabel(value) });
  }
  return out;
}
