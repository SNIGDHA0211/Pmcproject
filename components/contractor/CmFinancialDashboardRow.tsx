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
  contractValues: ContractValuesDashboard | null;
  invoicing: InvoicingDashboard | null;
  contractors: ContractorMasterRecord[];
  selectedContractorMasterId: number | null;
  contractorDisplayName?: string;
  selectedContractorContractValues?: ContractValueApiRecord | null;
  selectedContractorInvoicing?: InvoicingApiRecord | null;
  loadingSelectedContractorFinancial?: boolean;
  loadingFinancial?: boolean;
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
  loadingFinancial = false,
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
      contractValues
        ? resolveCmContractValuesPanel(
            contractValues,
            selectedContractorMasterId,
            contractorLabel,
            selectedMaster,
            selectedContractorContractValues,
          )
        : null,
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
      invoicing
        ? resolveCmInvoicingPanel(
            invoicing,
            selectedContractorMasterId,
            contractorLabel,
            selectedMaster,
            selectedContractorInvoicing,
          )
        : null,
    [
      contractorLabel,
      invoicing,
      selectedContractorMasterId,
      selectedMaster,
      selectedContractorInvoicing,
    ],
  );

  const contractorContractValues = contractPanel
    ? isCumulativeView
      ? contractPanel.contractorSummaryCv
      : contractPanel.selectedContractorCv
    : null;
  const contractorInvoicing = invoicingPanel
    ? isCumulativeView
      ? invoicingPanel.contractorSummaryInv
      : invoicingPanel.selectedContractorInv
    : null;

  const contractorContractValuesTitle = contractPanel
    ? isCumulativeView
      ? contractValuesSectionTitle('ContractorSummary')
      : contractValuesSectionTitle('SelectedContractor', contractPanel.contractorLabel)
    : contractValuesSectionTitle('ContractorSummary');
  const contractorInvoicingTitle = invoicingPanel
    ? isCumulativeView
      ? invoicingSectionTitle('ContractorSummary')
      : invoicingSectionTitle('SelectedContractor', invoicingPanel.contractorLabel)
    : invoicingSectionTitle('ContractorSummary');

  return (
    <section className="cm-financial-dashboard-row" aria-label="Contract values and invoicing">
      <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-2">
        <ContractValuesGroupCard
          key={`cv-${selectedContractorMasterId ?? 'cumulative'}`}
          id="tl-section-contract-values"
          className="h-full"
          sclData={contractPanel?.sclCv ?? null}
          contractorData={contractorContractValues}
          contractorSectionTitle={contractorContractValuesTitle}
          groupSubtitle="SCL & Contractor Portfolio"
          isLoading={loadingFinancial && !contractValues}
          contractorLoading={!isCumulativeView && loadingSelectedContractorFinancial}
          onEdit={onNavigateFinancial ? () => onNavigateFinancial('contracts') : undefined}
        />
        <InvoicingGroupCard
          key={`inv-${selectedContractorMasterId ?? 'cumulative'}`}
          id="tl-section-invoicing"
          className="h-full"
          pmcData={invoicingPanel?.sclInv ?? null}
          contractorData={contractorInvoicing}
          contractorSectionTitle={contractorInvoicingTitle}
          groupSubtitle="SCL & Contractor Billing"
          isLoading={loadingFinancial && !invoicing}
          contractorLoading={!isCumulativeView && loadingSelectedContractorFinancial}
          onEdit={onNavigateFinancial ? () => onNavigateFinancial('invoicing') : undefined}
        />
      </div>
    </section>
  );
};

export default CmFinancialDashboardRow;
