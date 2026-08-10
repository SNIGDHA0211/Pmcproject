/** Pick the financial row that belongs to the selected contractor (when API returns multiple). */

export interface ContractorDashboardRowRef {
  contractor_name?: string | null;
  contractor?: { id?: number; contractor_name?: string } | null;
}

export function findContractorDashboardRow<T extends ContractorDashboardRowRef>(
  rows: T[],
  master: { id: number; contractor_name: string } | null | undefined,
): T | null {
  if (!master || !rows.length) return null;

  const byId = rows.find((row) => row.contractor?.id === master.id);
  if (byId) return byId;

  const masterName = master.contractor_name.trim().toLowerCase();
  if (!masterName) return null;

  return (
    rows.find((row) => {
      const names = [row.contractor_name, row.contractor?.contractor_name]
        .filter(Boolean)
        .map((name) => String(name).trim().toLowerCase());
      return names.includes(masterName);
    }) ?? null
  );
}

export function pickRecordForContractor<T extends { contractorName?: string | null; contractorId?: number }>(
  records: T[],
  contractorName: string | null | undefined,
  contractorId?: number | null,
): T | null {
  if (!records.length) return null;

  if (contractorId != null) {
    const byId = records.find((row) => row.contractorId === contractorId);
    if (byId) return byId;
  }

  const normalized = contractorName?.trim().toLowerCase();
  if (normalized) {
    const exact = records.find(
      (row) => row.contractorName?.trim().toLowerCase() === normalized,
    );
    if (exact) return exact;
    return null;
  }

  if (records.length === 1) return records[0];

  const unnamed = records.find((row) => !row.contractorName?.trim());
  return unnamed ?? records[0];
}

/** Sum contractor contract-value rows for “Cumulative (All Contractors)” view. */
export function aggregateContractValueRecords(
  records: Array<{
    projectName: string;
    contractType: string;
    originalContractValue: number;
    approvedVO: number;
    revisedContractValue: number;
    potentialPendingVO: number;
    cosExtraItem: number;
  }>,
): {
  projectName: string;
  contractType: 'Contractor';
  originalContractValue: number;
  approvedVO: number;
  revisedContractValue: number;
  potentialPendingVO: number;
  cosExtraItem: number;
  growthPercentage: number;
} | null {
  if (!records.length) return null;
  const originalContractValue = records.reduce((s, r) => s + (Number(r.originalContractValue) || 0), 0);
  const approvedVO = records.reduce((s, r) => s + (Number(r.approvedVO) || 0), 0);
  const revisedContractValue = records.reduce((s, r) => s + (Number(r.revisedContractValue) || 0), 0);
  const potentialPendingVO = records.reduce((s, r) => s + (Number(r.potentialPendingVO) || 0), 0);
  const cosExtraItem = records.reduce((s, r) => s + (Number(r.cosExtraItem) || 0), 0);
  const growthPercentage =
    originalContractValue > 0
      ? ((revisedContractValue - originalContractValue) / originalContractValue) * 100
      : 0;
  return {
    projectName: records[0].projectName,
    contractType: 'Contractor',
    originalContractValue,
    approvedVO,
    revisedContractValue,
    potentialPendingVO,
    cosExtraItem,
    growthPercentage,
  };
}

/** Sum contractor invoicing rows for cumulative view. */
export function aggregateInvoicingRecords(
  records: Array<{
    projectName: string;
    invoiceType: string;
    grossBilled: number;
    netBilledWithoutVAT: number;
    netCollected: number;
  }>,
): {
  projectName: string;
  invoiceType: 'Contractor';
  grossBilled: number;
  netBilledWithoutVAT: number;
  netCollected: number;
  collectionPercentage: number;
} | null {
  if (!records.length) return null;
  const grossBilled = records.reduce((s, r) => s + (Number(r.grossBilled) || 0), 0);
  const netBilledWithoutVAT = records.reduce((s, r) => s + (Number(r.netBilledWithoutVAT) || 0), 0);
  const netCollected = records.reduce((s, r) => s + (Number(r.netCollected) || 0), 0);
  const collectionPercentage = grossBilled > 0 ? (netBilledWithoutVAT / grossBilled) * 100 : 0;
  return {
    projectName: records[0].projectName,
    invoiceType: 'Contractor',
    grossBilled,
    netBilledWithoutVAT,
    netCollected,
    collectionPercentage,
  };
}
