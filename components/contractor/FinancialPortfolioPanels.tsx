import React, { useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { ContractValuesGroupCard } from '../ContractValueTable';
import { InvoicingGroupCard } from '../InvoicingTable';
import type {
  ContractValuesDashboard,
  InvoicingDashboard,
} from '../../types/contractorManagement';
import {
  resolveCmContractValuesPanel,
  resolveCmInvoicingPanel,
} from '../../utils/contractorDashboardMappers';
import {
  contractValuesSectionTitle,
  invoicingSectionTitle,
} from '../../utils/dashboardContractorLabels';
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
  const contractorLabel = contractorDisplayName ?? 'Contractor';
  const isCumulativeView = selectedContractorMasterId == null;

  const editToolbar = onEditInFinancialManagement ? (
    <div className="mb-3 flex justify-end">
      <CmButton variant="secondary" icon={Pencil} onClick={onEditInFinancialManagement}>
        Edit in Financial Management
      </CmButton>
    </div>
  ) : null;

  const contractPanel = useMemo(() => {
    if (!contractValues) return null;
    const { sclCv, contractorSummaryCv, selectedContractorCv, contractorLabel: label } =
      resolveCmContractValuesPanel(
        contractValues,
        selectedContractorMasterId ?? null,
        contractorLabel,
      );

    return (
      <ContractValuesGroupCard
        sclData={sclCv}
        contractorData={isCumulativeView ? contractorSummaryCv : selectedContractorCv}
        contractorSectionTitle={
          isCumulativeView
            ? contractValuesSectionTitle('ContractorSummary')
            : contractValuesSectionTitle('SelectedContractor', label)
        }
        onEdit={onEditInFinancialManagement ? () => onEditInFinancialManagement() : undefined}
      />
    );
  }, [
    contractValues,
    contractorLabel,
    isCumulativeView,
    onEditInFinancialManagement,
    selectedContractorMasterId,
  ]);

  const invoicingPanel = useMemo(() => {
    if (!invoicing) return null;
    const { sclInv, contractorSummaryInv, selectedContractorInv, contractorLabel: label } =
      resolveCmInvoicingPanel(
        invoicing,
        selectedContractorMasterId ?? null,
        contractorLabel,
      );

    return (
      <InvoicingGroupCard
        pmcData={sclInv}
        contractorData={isCumulativeView ? contractorSummaryInv : selectedContractorInv}
        contractorSectionTitle={
          isCumulativeView
            ? invoicingSectionTitle('ContractorSummary')
            : invoicingSectionTitle('SelectedContractor', label)
        }
        onEdit={onEditInFinancialManagement ? () => onEditInFinancialManagement() : undefined}
      />
    );
  }, [
    contractorLabel,
    invoicing,
    isCumulativeView,
    onEditInFinancialManagement,
    selectedContractorMasterId,
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
