import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import type { Project } from '../../types';
import type { ContractorMasterRecord, ProjectDatesApiRecord } from '../../types/contractorManagement';
import type { BgManageScope } from '../ProjectDatesCard';
import { ProjectDatesGroupCard } from '../ProjectDatesCard';
import { useContractorManagementDashboard } from '../../hooks/useContractorManagementDashboard';
import {
  mapBgEntriesApi,
  mapProjectDatesApiRecord,
} from '../../utils/contractorDashboardMappers';
import AddContractorModal from './AddContractorModal';
import CmFinancialDashboardRow from './CmFinancialDashboardRow';
import { useCmTheme } from './enterpriseTheme';
import { CmButton, CmDashboardHeader, CmLoadingSkeleton } from './ui';

interface ContractorManagementDashboardProps {
  project: Project;
  dataRevision?: number;
  showProjectDates?: boolean;
  showFinancial?: boolean;
  onNavigateFinancial?: (section: 'contracts' | 'invoicing') => void;
  onEditSclDates?: () => void;
  onEditContractorDates?: (record: ProjectDatesApiRecord) => void;
  onAddContractorSchedule?: () => void;
  onManageBg?: (scope: 'all' | 'SCL' | 'CONTRACTOR') => void;
  onContractorCreated?: (record: ContractorMasterRecord) => void;
}

const ContractorManagementDashboard: React.FC<ContractorManagementDashboardProps> = ({
  project,
  dataRevision = 0,
  showProjectDates = true,
  showFinancial = true,
  onEditSclDates,
  onEditContractorDates,
  onAddContractorSchedule,
  onManageBg,
  onContractorCreated,
  onNavigateFinancial,
}) => {
  const [isAddContractorOpen, setIsAddContractorOpen] = useState(false);
  const [projectDatesContractorId, setProjectDatesContractorId] = useState<number | null>(null);
  const theme = useCmTheme();
  const cm = useContractorManagementDashboard(project.title, dataRevision);

  const handleContractorCreated = (record: ContractorMasterRecord) => {
    cm.setSelectedContractorMasterId(record.id);
    void cm.refresh();
    onContractorCreated?.(record);
  };

  const contractorLabel = cm.selectedMaster?.contractor_name ?? 'Contractor';

  const mappedProjectDates = useMemo(() => {
    if (!cm.projectDates) return null;
    return {
      scl: cm.projectDates.scl ? mapProjectDatesApiRecord(cm.projectDates.scl) : null,
      contractors: cm.projectDates.contractors.map(mapProjectDatesApiRecord),
      sclBg: mapBgEntriesApi(cm.projectDates.scl_bg ?? []),
      contractorBg: mapBgEntriesApi(cm.projectDates.contractor_bg ?? []),
    };
  }, [cm.projectDates]);

  useEffect(() => {
    if (!mappedProjectDates?.contractors.length) {
      setProjectDatesContractorId(null);
      return;
    }
    setProjectDatesContractorId((prev) => {
      if (prev && mappedProjectDates.contractors.some((c) => c.id === prev)) return prev;
      return mappedProjectDates.contractors[0]?.id ?? null;
    });
  }, [mappedProjectDates?.contractors]);

  const handleManageBgScope = useCallback(
    (scope: BgManageScope) => {
      if (!onManageBg) return;
      if (scope === 'all') onManageBg('all');
      else if (scope === 'SCL') onManageBg('SCL');
      else onManageBg('CONTRACTOR');
    },
    [onManageBg],
  );

  if (cm.loading && !cm.contractValues && !cm.projectDates) {
    return (
      <div className={theme.root}>
        <CmLoadingSkeleton />
      </div>
    );
  }

  const projectDatesSection =
    mappedProjectDates ? (
      <ProjectDatesGroupCard
        sclData={mappedProjectDates.scl}
        contractors={mappedProjectDates.contractors}
        selectedContractorId={projectDatesContractorId}
        onSelectContractor={setProjectDatesContractorId}
        hideContractorSelector={false}
        sclBgEntries={mappedProjectDates.sclBg}
        contractorBgEntries={mappedProjectDates.contractorBg}
        bgSummary={null}
        onEditScl={onEditSclDates}
        onEditContractor={
          onEditContractorDates
            ? (record) => {
              const apiRecord = cm.projectDates?.contractors.find((c) => c.id === record.id);
              if (apiRecord) onEditContractorDates(apiRecord);
            }
            : undefined
        }
        onAddContractor={onAddContractorSchedule}
        onManageBg={onManageBg ? handleManageBgScope : undefined}
      />
    ) : null;

  return (
    <div className={`contractor-management-dashboard font-[Inter,system-ui,sans-serif] ${theme.root}`}>
      {showProjectDates && projectDatesSection}

      {showFinancial && (
        <CmDashboardHeader
          projectTitle={project.title}
          contractors={cm.masters}
          selectedViewId={cm.selectedContractorMasterId}
          onViewChange={cm.setSelectedContractorMasterId}
          onAddContractor={() => setIsAddContractorOpen(true)}
          onRefresh={() => void cm.refresh()}
          loading={cm.loading}
          lastUpdated={cm.lastUpdated}
          error={cm.error}
        />
      )}

      <div className={`${theme.content} contractor-management-sections`}>
        {showFinancial && cm.contractValues && cm.invoicing && (
          <CmFinancialDashboardRow
            contractValues={cm.contractValues}
            invoicing={cm.invoicing}
            contractors={cm.masters}
            selectedContractorMasterId={cm.selectedContractorMasterId}
            contractorDisplayName={contractorLabel}
            selectedContractorContractValues={cm.selectedContractorContractValues}
            selectedContractorInvoicing={cm.selectedContractorInvoicing}
            loadingSelectedContractorFinancial={cm.loadingSelectedContractorFinancial}
            onNavigateFinancial={onNavigateFinancial}
          />
        )}
      </div>

      {cm.contractorCount === 0 && !cm.loading && (
        <div className={`${theme.panel} p-6 text-center`}>
          <Users className={`mx-auto ${theme.emptyIcon}`} size={32} aria-hidden />
          <p className={`mt-2 ${theme.emptyTitle}`}>No contractors yet</p>
          <p className={`mt-0.5 ${theme.emptySubtitle}`}>Add a contractor to get started</p>
          <CmButton variant="primary" icon={Plus} onClick={() => setIsAddContractorOpen(true)} className="mt-4">
            Add Contractor
          </CmButton>
        </div>
      )}

      <AddContractorModal
        open={isAddContractorOpen}
        projectName={project.title}
        onClose={() => setIsAddContractorOpen(false)}
        onCreated={handleContractorCreated}
      />
    </div>
  );
};

export default ContractorManagementDashboard;
