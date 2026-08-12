import type { MprPreviewSnapshot } from '../types/mpr';
import { displayValue, formatInr, humanizeKey } from './mprHelpers';

export type MprKpiItem = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'muted';
};

export function extractMprKpis(snapshot: MprPreviewSnapshot | null): MprKpiItem[] {
  if (!snapshot) return [];

  const exec = (snapshot.executive_summary ?? {}) as Record<string, unknown>;
  const physical = exec.physical_progress_billed_till_date as Record<string, unknown> | undefined;
  const financial = exec.financial_progress_billed_till_date as Record<string, unknown> | undefined;
  const cum = (snapshot.physical_progress as Record<string, unknown> | undefined)?.cumulative as
    | Record<string, unknown>
    | undefined;
  const completeness = (snapshot.report_completeness ?? {}) as Record<string, unknown>;

  const items: MprKpiItem[] = [];

  if (physical?.actual_percentage != null) {
    items.push({
      label: 'Physical progress',
      value: `${displayValue(physical.actual_percentage)}%`,
      hint: physical.data_source ? String(physical.data_source) : undefined,
      tone: physical.actual_available === false ? 'muted' : 'success',
    });
  }

  if (financial?.actual_amount != null) {
    items.push({
      label: 'Billed amount',
      value: formatInr(financial.actual_amount),
      hint: financial.data_source ? String(financial.data_source) : undefined,
    });
  }

  if (financial?.certified_amount != null) {
    items.push({
      label: 'Certified amount',
      value: formatInr(financial.certified_amount),
    });
  }

  if (cum?.actual_percentage != null) {
    items.push({
      label: 'Cumulative scope %',
      value: `${displayValue(cum.actual_percentage)}%`,
    });
  }

  const score =
    completeness.overall_score ??
    completeness.score ??
    completeness.percentage ??
    completeness.completeness_percentage;
  if (score != null) {
    items.push({
      label: 'Report completeness',
      value: `${displayValue(score)}%`,
      tone: Number(score) >= 80 ? 'success' : Number(score) >= 50 ? 'warning' : 'default',
    });
  }

  return items.slice(0, 5);
}

export function hasSectionData(block: unknown): boolean {
  if (block == null) return false;
  if (Array.isArray(block)) return block.length > 0;
  if (typeof block !== 'object') return String(block).trim().length > 0;
  const obj = block as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => {
    const v = obj[k];
    if (v == null || v === '') return false;
    if (typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v as object).length > 0;
    }
    return true;
  });
  return keys.length > 0;
}

export const MPR_PREVIEW_SECTIONS: { key: keyof MprPreviewSnapshot; title: string }[] = [
  { key: 'key_indicators', title: 'Key indicators' },
  { key: 'time_progress', title: 'Time progress' },
  { key: 'eot', title: 'EOT' },
  { key: 'financial_progress', title: 'Financial progress' },
  { key: 'bg', title: 'Bank guarantee' },
  { key: 'correspondence', title: 'Correspondence' },
  { key: 'drawings', title: 'Drawings' },
  { key: 'bottlenecks', title: 'Bottlenecks' },
  { key: 'quality', title: 'Quality' },
  { key: 'hse', title: 'HSE' },
  { key: 'manpower', title: 'Manpower' },
  { key: 'equipment', title: 'Equipment' },
  { key: 'site_photos', title: 'Site photos' },
  { key: 'meetings', title: 'Meetings' },
  { key: 'next_month_program', title: 'Next month program' },
  { key: 'materials', title: 'Materials' },
  { key: 'laboratory_equipment', title: 'Laboratory equipment' },
  { key: 'achievements', title: 'Achievements' },
  { key: 'client_decisions', title: 'Client decisions' },
  { key: 'data_availability', title: 'Data availability' },
  { key: 'validation', title: 'Validation' },
  { key: 'report_completeness', title: 'Report completeness' },
];

export function flattenForDisplay(obj: Record<string, unknown>, maxDepth = 2): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value == null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      if (typeof value[0] === 'object') {
        out[key] = `${value.length} item(s)`;
      } else {
        out[key] = value.map((v) => displayValue(v)).join(', ');
      }
      continue;
    }
    if (typeof value === 'object' && maxDepth > 0) {
      const nested = flattenForDisplay(value as Record<string, unknown>, maxDepth - 1);
      if (Object.keys(nested).length > 0) {
        for (const [nk, nv] of Object.entries(nested)) {
          out[`${humanizeKey(key)} — ${humanizeKey(nk)}`] = nv;
        }
      }
      continue;
    }
    out[key] = value;
  }
  return out;
}
