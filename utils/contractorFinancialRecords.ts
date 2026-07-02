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
