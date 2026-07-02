import React, { useMemo } from 'react';
import { ContractValuesGroupCard } from '../ContractValueTable';
import { InvoicingGroupCard } from '../InvoicingTable';
import type {
  ContractValueApiRecord,
  ContractValuesDashboard,
  ContractorMasterRecord,
  InvoicingApiRecord,
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

interface CmFinancialDashboardRowProps {
  contractValues: ContractValuesDashboard;
  invoicing: InvoicingDashboard;
  contractors: ContractorMasterRecord[];
  selectedContractorMasterId: number | null;
  contractorDisplayName?: string;
  selectedContractorContractValues?: ContractValueApiRecord | null;
  selectedContractorInvoicing?: InvoicingApiRecord | null;
  loadingSelectedContractorFinancial?: boolean;
  onNavigateFinancial?: (section: 'contracts' | 'invoicing') => void;
}

const CmFinancialDashboardRow: React.FC<CmFinancialDashboardRowProps> = ({
  contractValues,
  invoicing,
  contractors,
  selectedContractorMasterId,
  contractorDisplayName,
  selectedContractorContractValues = null,
  selectedContractorInvoicing = null,
  loadingSelectedContractorFinancial = false,
  onNavigateFinancial,
}) => {
  const contractorLabel = contractorDisplayName ?? 'Contractor';
  const isCumulativeView = selectedContractorMasterId == null;

  const selectedMaster = useMemo(
    () => contractors.find((c) => c.id === selectedContractorMasterId) ?? null,
    [contractors, selectedContractorMasterId],
  );

  const contractPanel = useMemo(
    () =>
      resolveCmContractValuesPanel(
        contractValues,
        selectedContractorMasterId,
        contractorLabel,
        selectedMaster,
        selectedContractorContractValues,
      ),
    [
      contractValues,
      contractorLabel,
      selectedContractorMasterId,
      selectedMaster,
      selectedContractorContractValues,
    ],
  );

  const invoicingPanel = useMemo(
    () =>
      resolveCmInvoicingPanel(
        invoicing,
        selectedContractorMasterId,
        contractorLabel,
        selectedMaster,
        selectedContractorInvoicing,
      ),
    [
      contractorLabel,
      invoicing,
      selectedContractorMasterId,
      selectedMaster,
      selectedContractorInvoicing,
    ],
  );

  const contractorContractValues = isCumulativeView
    ? contractPanel.contractorSummaryCv
    : contractPanel.selectedContractorCv;
  const contractorInvoicing = isCumulativeView
    ? invoicingPanel.contractorSummaryInv
    : invoicingPanel.selectedContractorInv;

  const contractorContractValuesTitle = isCumulativeView
    ? contractValuesSectionTitle('ContractorSummary')
    : contractValuesSectionTitle('SelectedContractor', contractPanel.contractorLabel);
  const contractorInvoicingTitle = isCumulativeView
    ? invoicingSectionTitle('ContractorSummary')
    : invoicingSectionTitle('SelectedContractor', invoicingPanel.contractorLabel);

  return (
    <section className="cm-financial-dashboard-row" aria-label="Contract values and invoicing">
      <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-2">
        <ContractValuesGroupCard
          key={`cv-${selectedContractorMasterId ?? 'cumulative'}`}
          className="h-full"
          sclData={contractPanel.sclCv}
          contractorData={contractorContractValues}
          contractorSectionTitle={contractorContractValuesTitle}
          groupSubtitle="SCL & Contractor Portfolio"
          contractorLoading={!isCumulativeView && loadingSelectedContractorFinancial}
          onEdit={onNavigateFinancial ? () => onNavigateFinancial('contracts') : undefined}
        />
        <InvoicingGroupCard
          key={`inv-${selectedContractorMasterId ?? 'cumulative'}`}
          className="h-full"
          pmcData={invoicingPanel.sclInv}
          contractorData={contractorInvoicing}
          contractorSectionTitle={contractorInvoicingTitle}
          groupSubtitle="SCL & Contractor Billing"
          contractorLoading={!isCumulativeView && loadingSelectedContractorFinancial}
          onEdit={onNavigateFinancial ? () => onNavigateFinancial('invoicing') : undefined}
        />
      </div>
    </section>
  );
};

export default CmFinancialDashboardRow;
