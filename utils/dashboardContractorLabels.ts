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
  party: 'SCL' | 'Contractor' | 'ContractorSummary' | 'SelectedContractor',
  contractorName?: string | null,
): string {
  if (party === 'SCL') return 'SCL Contract Values';
  if (party === 'ContractorSummary') return 'Contractor Summary (All Contractors)';
  if (party === 'SelectedContractor') {
    return `Selected Contractor – ${contractorDisplayName(contractorName)}`;
  }
  if (contractorName?.trim()) {
    return `${contractorDisplayName(contractorName)} Contract Values`;
  }
  return 'Contractor Contract Values';
}

export function invoicingSectionTitle(
  party: 'SCL' | 'Contractor' | 'ContractorSummary' | 'SelectedContractor',
  contractorName?: string | null,
): string {
  if (party === 'SCL') return 'SCL Invoicing Information';
  if (party === 'ContractorSummary') return 'Contractor Summary (All Contractors)';
  if (party === 'SelectedContractor') {
    return `Selected Contractor – ${contractorDisplayName(contractorName)}`;
  }
  if (contractorName?.trim()) {
    return `${contractorDisplayName(contractorName)} Invoicing Information`;
  }
  return 'Contractor Invoicing Information';
}

export function plannedValueSectionTitle(
  party: 'SCL' | 'Contractor',
  contractorName?: string | null,
): string {
  if (party === 'SCL') return 'SCL Planned vs Actual';
  return contractorSectionTitle(contractorName, 'Planned vs Actual');
}
