import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchContractorManagementBundle,
  contractValuesDashboardApi,
  invoicingDashboardApi,
  getApiErrorMessage,
} from '../services/contractorManagementApi';
import type {
  ContractValueApiRecord,
  ContractValuesDashboard,
  ContractorMasterRecord,
  InvoicingApiRecord,
  InvoicingDashboard,
  ProjectDatesApiRecord,
  ProjectDatesDashboard,
} from '../types/contractorManagement';
import { findContractorDashboardRow } from '../utils/contractorFinancialRecords';

export interface ContractorManagementState {
  masters: ContractorMasterRecord[];
  contractValues: ContractValuesDashboard | null;
  invoicing: InvoicingDashboard | null;
  projectDates: ProjectDatesDashboard | null;
  selectedContractorMasterId: number | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useContractorManagementDashboard(
  projectName: string | undefined,
  dataRevision = 0,
) {
  const [masters, setMasters] = useState<ContractorMasterRecord[]>([]);
  const [contractValues, setContractValues] = useState<ContractValuesDashboard | null>(null);
  const [invoicing, setInvoicing] = useState<InvoicingDashboard | null>(null);
  const [projectDates, setProjectDates] = useState<ProjectDatesDashboard | null>(null);
  const [selectedContractorMasterId, setSelectedContractorMasterId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedContractorContractValues, setSelectedContractorContractValues] =
    useState<ContractValueApiRecord | null>(null);
  const [selectedContractorInvoicing, setSelectedContractorInvoicing] =
    useState<InvoicingApiRecord | null>(null);
  const [loadingSelectedContractorFinancial, setLoadingSelectedContractorFinancial] =
    useState(false);

  const load = useCallback(async () => {
    if (!projectName?.trim()) {
      setMasters([]);
      setContractValues(null);
      setInvoicing(null);
      setProjectDates(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const bundle = await fetchContractorManagementBundle(projectName);
      setMasters(bundle.masters);
      setContractValues(bundle.contractValues);
      setInvoicing(bundle.invoicing);
      setProjectDates(bundle.projectDates);
      setLastUpdated(new Date());

      const activeIds = bundle.masters.filter((m) => m.status === 'ACTIVE').map((m) => m.id);
      setSelectedContractorMasterId((prev) => {
        if (prev === null) return null;
        if (prev && activeIds.includes(prev)) return prev;
        return null;
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load contractor dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  useEffect(() => {
    void load();
  }, [load, dataRevision]);

  useEffect(() => {
    if (!projectName?.trim() || !selectedContractorMasterId) {
      setSelectedContractorContractValues(null);
      setSelectedContractorInvoicing(null);
      setLoadingSelectedContractorFinancial(false);
      return;
    }

    let cancelled = false;
    setLoadingSelectedContractorFinancial(true);

    Promise.allSettled([
      contractValuesDashboardApi.getByContractor(projectName, selectedContractorMasterId),
      invoicingDashboardApi.getByContractor(projectName, selectedContractorMasterId),
    ])
      .then(([contractValuesResult, invoicingResult]) => {
        if (cancelled) return;
        setSelectedContractorContractValues(
          contractValuesResult.status === 'fulfilled' ? contractValuesResult.value : null,
        );
        setSelectedContractorInvoicing(
          invoicingResult.status === 'fulfilled' ? invoicingResult.value : null,
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingSelectedContractorFinancial(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectName, selectedContractorMasterId, dataRevision, lastUpdated]);

  const selectedMaster = useMemo(
    () => masters.find((m) => m.id === selectedContractorMasterId) ?? null,
    [masters, selectedContractorMasterId],
  );

  const selectedDatesRecord: ProjectDatesApiRecord | null = useMemo(() => {
    if (!projectDates || !selectedMaster) return null;
    return (
      projectDates.contractors.find((c) => c.contractor?.id === selectedMaster.id) ?? null
    );
  }, [projectDates, selectedMaster]);

  const selectedContractValuesRow = useMemo(() => {
    if (!contractValues || !selectedMaster) return null;
    return findContractorDashboardRow(contractValues.contractors, selectedMaster);
  }, [contractValues, selectedMaster]);

  const selectedInvoicingRow = useMemo(() => {
    if (!invoicing || !selectedMaster) return null;
    return findContractorDashboardRow(invoicing.contractors, selectedMaster);
  }, [invoicing, selectedMaster]);

  const contractorCount = masters.filter((m) => m.status === 'ACTIVE').length;

  return {
    masters,
    contractValues,
    invoicing,
    projectDates,
    selectedContractorMasterId,
    setSelectedContractorMasterId,
    selectedMaster,
    selectedDatesRecord,
    selectedContractValuesRow,
    selectedInvoicingRow,
    contractorCount,
    loading,
    error,
    lastUpdated,
    refresh: load,
    selectedContractorContractValues,
    selectedContractorInvoicing,
    loadingSelectedContractorFinancial,
  };
}
