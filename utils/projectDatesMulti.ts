import type { ProjectDatesByProject, ProjectDatesRecord } from '../services/api';
import type { BGEntry } from '../types/bgStatus';

export function getContractorsList(bundle: ProjectDatesByProject | null): ProjectDatesRecord[] {
  if (!bundle) return [];
  if (bundle.contractors?.length) return bundle.contractors;
  if (bundle.contractor) return [bundle.contractor];
  return [];
}

export function contractorLabel(record: ProjectDatesRecord | null | undefined): string {
  return record?.contractor_name?.trim() || 'Contractor';
}

export function resolveSelectedContractor(
  contractors: ProjectDatesRecord[],
  selectedId: number | null,
): ProjectDatesRecord | null {
  if (!contractors.length) return null;
  if (selectedId != null) {
    const match = contractors.find((c) => c.id === selectedId);
    if (match) return match;
  }
  return contractors[0];
}

export function filterContractorBgEntries(
  entries: BGEntry[],
  contractorName: string,
  contractorCount: number,
): BGEntry[] {
  const normalized = contractorName.trim().toLowerCase();
  if (!normalized) return entries;

  const scoped = entries.filter(
    (entry) => entry.contractor_name?.trim().toLowerCase() === normalized,
  );
  if (scoped.length > 0) return scoped;

  if (contractorCount === 1) {
    return entries.filter((entry) => !entry.contractor_name?.trim());
  }

  return [];
}

export function maxContractorDelay(contractors: ProjectDatesRecord[]): number {
  let max = 0;
  for (const record of contractors) {
    // Only count days late (positive). Ahead-of-schedule (negative) is not a delay.
    const delay = Math.round(Number(record.current_delay ?? record.delay_days ?? 0));
    if (Number.isFinite(delay) && delay > max) max = delay;
  }
  return max;
}

export function contractorBgNames(entries: BGEntry[]): string[] {
  const names = new Set<string>();
  for (const entry of entries) {
    const name = entry.contractor_name?.trim();
    if (name) names.add(name);
  }
  return [...names];
}

/** Keep contractor names when GET response omits contractor_name */
export function applyContractorNameToBundle(
  bundle: ProjectDatesByProject,
  contractorId: number,
  contractorName: string,
): ProjectDatesByProject {
  const name = contractorName.trim();
  if (!name) return bundle;

  const contractors = bundle.contractors.map((c) =>
    c.id === contractorId ? { ...c, contractor_name: name } : c,
  );

  const contractor =
    bundle.contractor?.id === contractorId
      ? { ...bundle.contractor, contractor_name: name }
      : contractors.find((c) => c.id === contractorId) ?? bundle.contractor;

  return { ...bundle, contractors, contractor };
}

export function preserveContractorNames(
  next: ProjectDatesByProject,
  prev: ProjectDatesByProject | null,
): ProjectDatesByProject {
  if (!prev) return next;

  let result = next;
  for (const c of getContractorsList(prev)) {
    if (!c.id || !c.contractor_name?.trim()) continue;
    const updated = result.contractors.find((r) => r.id === c.id);
    if (updated && !updated.contractor_name?.trim()) {
      result = applyContractorNameToBundle(result, c.id, c.contractor_name);
    }
  }
  return result;
}
