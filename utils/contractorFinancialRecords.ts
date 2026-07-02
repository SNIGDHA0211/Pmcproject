/** Pick the financial row that belongs to the selected contractor (when API returns multiple). */

export function pickRecordForContractor<T extends { contractorName?: string | null }>(
  records: T[],
  contractorName: string | null | undefined,
): T | null {
  if (!records.length) return null;

  const normalized = contractorName?.trim().toLowerCase();
  if (normalized) {
    const exact = records.find(
      (row) => row.contractorName?.trim().toLowerCase() === normalized,
    );
    if (exact) return exact;
  }

  if (records.length === 1) return records[0];

  const unnamed = records.find((row) => !row.contractorName?.trim());
  return unnamed ?? records[0];
}
