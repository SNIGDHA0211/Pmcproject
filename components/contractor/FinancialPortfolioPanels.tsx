import React, { useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { ContractValuesGroupCard } from '../ContractValueTable';
import { InvoicingGroupCard } from '../InvoicingTable';
import type {
  ContractValuesDashboard,
  InvoicingDashboard,
} from '../../types/contractorManagement';
import {
  mapContractValueApiRecord,
  mapContractValueSummary,
  mapInvoicingApiRecord,
  mapInvoicingSummary,
} from '../../utils/contractorDashboardMappers';
import { useCmTheme } from './enterpriseTheme';
import CmButton from './ui/CmButton';

export type FinancialPanelMode = 'contract_values' | 'invoicing';

interface FinancialPortfolioPanelsProps {
  mode: FinancialPanelMode;
  contractValues?: ContractValuesDashboard | null;
  invoicing?: InvoicingDashboard | null;
  contractorDisplayName?: string;
  selectedContractorMasterId?: number | null;
  onEditInFinancialManagement?: () => void;
}

const FinancialPortfolioPanels: React.FC<FinancialPortfolioPanelsProps> = ({
  mode,
  contractValues,
  invoicing,
  contractorDisplayName,
  selectedContractorMasterId,
  onEditInFinancialManagement,
}) => {
  const theme = useCmTheme();
  const contractorLabel = contractorDisplayName ?? 'All Contractors';

  const editToolbar = onEditInFinancialManagement ? (
    <div className="mb-3 flex justify-end">
      <CmButton variant="secondary" icon={Pencil} onClick={onEditInFinancialManagement}>
        Edit in Financial Management
      </CmButton>
    </div>
  ) : null;

  const contractPanel = useMemo(() => {
    if (!contractValues) return null;

    const sclCv = contractValues.scl ? mapContractValueApiRecord(contractValues.scl) : null;

    const selectedRow = selectedContractorMasterId
      ? contractValues.contractors.find((c) => c.contractor?.id === selectedContractorMasterId)
      : null;

    const contractorCv = selectedRow
      ? mapContractValueApiRecord(selectedRow.contract_values, selectedRow.contractor_name)
      : mapContractValueSummary(
          contractValues.project_name,
          contractValues.contractor_summary,
          contractorLabel,
        );

    return (
      <div className={theme.financialWrap.contract}>
        <ContractValuesGroupCard
          sclData={sclCv}
          contractorData={contractorCv}
          contractorDisplayName={selectedRow?.contractor_name ?? contractorLabel}
          onEdit={onEditInFinancialManagement ? () => onEditInFinancialManagement() : undefined}
        />
      </div>
    );
  }, [
    contractValues,
    contractorLabel,
    onEditInFinancialManagement,
    selectedContractorMasterId,
    theme.financialWrap.contract,
  ]);

  const invoicingPanel = useMemo(() => {
    if (!invoicing) return null;

    const sclInv = invoicing.scl ? mapInvoicingApiRecord(invoicing.scl) : null;

    const selectedRow = selectedContractorMasterId
      ? invoicing.contractors.find((c) => c.contractor?.id === selectedContractorMasterId)
      : null;

    const contractorInv = selectedRow
      ? mapInvoicingApiRecord(selectedRow.invoicing, selectedRow.contractor_name)
      : mapInvoicingSummary(
          invoicing.project_name,
          invoicing.contractor_summary,
          contractorLabel,
        );

    return (
      <div className={theme.financialWrap.invoicing}>
        <InvoicingGroupCard
          pmcData={sclInv}
          contractorData={contractorInv}
          contractorDisplayName={selectedRow?.contractor_name ?? contractorLabel}
          onEdit={onEditInFinancialManagement ? () => onEditInFinancialManagement() : undefined}
        />
      </div>
    );
  }, [
    contractorLabel,
    invoicing,
    onEditInFinancialManagement,
    selectedContractorMasterId,
    theme.financialWrap.invoicing,
  ]);

  if (mode === 'contract_values') {
    return (
      <>
        {editToolbar}
        {contractPanel}
      </>
    );
  }

  return (
    <>
      {editToolbar}
      {invoicingPanel}
    </>
  );
};

export default FinancialPortfolioPanels;
