/** Plain-language labels for non-technical dashboard users. */

export const DASHBOARD_SCL_LABEL = 'SCL (Project Owner)';

export function contractorDisplayName(
  name: string | null | undefined,
  fallback = 'Contractor',
): string {
  const trimmed = name?.trim();
  return trimmed || fallback;
}

export function contractorSectionTitle(
  name: string | null | undefined,
  topic: string,
): string {
  const who = contractorDisplayName(name);
  return `${who} — ${topic}`;
}

export function contractValuesSectionTitle(
  party: 'SCL' | 'Contractor',
  contractorName?: string | null,
): string {
  if (party === 'SCL') return 'SCL Contract Values';
  return contractorSectionTitle(contractorName, 'Contract Values');
}

export function invoicingSectionTitle(
  party: 'SCL' | 'Contractor',
  contractorName?: string | null,
): string {
  if (party === 'SCL') return 'SCL Invoicing';
  return contractorSectionTitle(contractorName, 'Invoicing');
}

export function plannedValueSectionTitle(
  party: 'SCL' | 'Contractor',
  contractorName?: string | null,
): string {
  if (party === 'SCL') return 'SCL Planned vs Actual';
  return contractorSectionTitle(contractorName, 'Planned vs Actual');
}
