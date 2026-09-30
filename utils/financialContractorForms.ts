import type { ContractValueType, InvoiceType } from '../types';
import {
  contractValuesApi,
  invoicingApi,
  normalizeContractValueRecord,
  normalizeInvoicingRecord,
  unwrapList,
} from '../services/api';
import { pickRecordForContractor } from './contractorFinancialRecords';
import { formatFinancialMonthYear, pickInvoicingRecord } from './financialPeriod';

export async function loadContractorContractValue(
  projectName: string,
  contractorName: string,
  contractorId?: number | null,
): Promise<ReturnType<typeof normalizeContractValueRecord> | null> {
  const response = await contractValuesApi.getContractValues({
    projectName,
    contractType: 'Contractor',
    contractorName,
    ...(contractorId != null ? { contractorId } : {}),
  });
  const rows = unwrapList<Record<string, unknown>>(response.data).map((row) =>
    normalizeContractValueRecord(row, projectName, 'Contractor'),
  );
  if (rows.length > 0) {
    return pickRecordForContractor(rows, contractorName, contractorId);
  }

  const fallback = await contractValuesApi.getContractValues({
    projectName,
    contractType: 'Contractor',
  });
  const allRows = unwrapList<Record<string, unknown>>(fallback.data).map((row) =>
    normalizeContractValueRecord(row, projectName, 'Contractor'),
  );
  return pickRecordForContractor(allRows, contractorName, contractorId);
}

export async function loadContractorInvoicing(
  projectName: string,
  contractorName: string,
  contractorId?: number | null,
  month?: number,
  year?: number,
): Promise<ReturnType<typeof normalizeInvoicingRecord> | null> {
  const monthYear = month != null && year != null ? formatFinancialMonthYear(month, year) : undefined;
  const response = await invoicingApi.getInvoicing({
    projectName,
    invoiceType: 'Contractor' as InvoiceType,
    contractorName,
    ...(contractorId != null ? { contractorId } : {}),
    ...(month != null ? { month } : {}),
    ...(year != null ? { year } : {}),
    ...(monthYear ? { monthYear } : {}),
  });
  let rows = unwrapList<Record<string, unknown>>(response.data).map((row) =>
    normalizeInvoicingRecord(row, projectName, 'Contractor'),
  );

  if (rows.length === 0) {
    const fallback = await invoicingApi.getInvoicing({
      projectName,
      invoiceType: 'Contractor',
    });
    rows = unwrapList<Record<string, unknown>>(fallback.data).map((row) =>
      normalizeInvoicingRecord(row, projectName, 'Contractor'),
    );
  }

  if (month != null && year != null) {
    const periodPicked = pickInvoicingRecord(rows, month, year);
    if (periodPicked) {
      return pickRecordForContractor([periodPicked], contractorName, contractorId) ?? periodPicked;
    }
  }

  return pickRecordForContractor(rows, contractorName, contractorId);
}

export async function loadContractorFinancialBuckets(
  projectName: string,
  contractorName: string,
  contractorId?: number | null,
  month?: number,
  year?: number,
): Promise<{
  contractValue: ReturnType<typeof normalizeContractValueRecord> | null;
  invoicing: ReturnType<typeof normalizeInvoicingRecord> | null;
}> {
  const [contractValue, invoicing] = await Promise.all([
    loadContractorContractValue(projectName, contractorName, contractorId),
    loadContractorInvoicing(projectName, contractorName, contractorId, month, year),
  ]);
  return { contractValue, invoicing };
}
