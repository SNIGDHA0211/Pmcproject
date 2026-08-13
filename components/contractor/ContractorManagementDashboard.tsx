import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import type { Project, UserRole } from '../../types';
import type { ContractorMasterRecord, ProjectDatesApiRecord } from '../../types/contractorManagement';
import type { ProjectDatesRecord } from '../../services/api';
import type { BgManageScope } from '../ProjectDatesCard';
import { ProjectDatesGroupCard } from '../ProjectDatesCard';
import ProjectEotSection from '../projectEot/ProjectEotSection';
import { useContractorManagementDashboard } from '../../hooks/useContractorManagementDashboard';
import {
  mapBgEntriesApi,
  mapProjectDatesApiRecord,
} from '../../utils/contractorDashboardMappers';
import { getProjectDatesSectionAccess } from '../../utils/pmcRoleAccess';
import AddContractorModal from './AddContractorModal';
import CmFinancialDashboardRow from './CmFinancialDashboardRow';
import { useCmTheme } from './enterpriseTheme';
import { CmButton, CmDashboardHeader, CmLoadingSkeleton } from './ui';

interface ContractorManagementDashboardProps {
  project: Project;
  userId?: string;
  userRole?: UserRole;
  dataRevision?: number;
  showProjectDates?: boolean;
  showFinancial?: boolean;
  onNavigateFinancial?: (section: 'contracts' | 'invoicing') => void;
  onEditSclDates?: (sclRecord?: ProjectDatesApiRecord | null) => void;
  onEditContractorDates?: (record: ProjectDatesApiRecord) => void;
  onAddContractorSchedule?: () => void;
  onDeleteContractorSchedule?: (record: ProjectDatesRecord) => void;
  onManageBg?: (scope: 'all' | 'SCL' | 'CONTRACTOR') => void;
  onContractorCreated?: (record: ContractorMasterRecord) => void;
}

const ContractorManagementDashboard: React.FC<ContractorManagementDashboardProps> = ({
  project,
  userId = '',
  userRole,
  dataRevision = 0,
  showProjectDates = true,
  showFinancial = true,
  onEditSclDates,
  onEditContractorDates,
  onAddContractorSchedule,
  onDeleteContractorSchedule,
  onManageBg,
  onContractorCreated,
  onNavigateFinancial,
}) => {
  const [isAddContractorOpen, setIsAddContractorOpen] = useState(false);
  const [projectDatesContractorId, setProjectDatesContractorId] = useState<number | null>(null);
  const theme = useCmTheme();
  const datesAccess = getProjectDatesSectionAccess(userRole);
  const cm = useContractorManagementDashboard(project.title, dataRevision);

  const effectiveProjectDates = cm.projectDates;
  const projectDatesCardLoading = cm.loading && !effectiveProjectDates;

  const handleContractorCreated = (record: ContractorMasterRecord) => {
    cm.setSelectedContractorMasterId(record.id);
    void cm.refresh();
    onContractorCreated?.(record);
  };

  const contractorLabel = cm.selectedMaster?.contractor_name ?? 'Contractor';

  const mappedProjectDates = useMemo(() => {
    if (!effectiveProjectDates) return null;
    return {
      scl: effectiveProjectDates.scl ? mapProjectDatesApiRecord(effectiveProjectDates.scl) : null,
      contractors: effectiveProjectDates.contractors.map(mapProjectDatesApiRecord),
      sclBg: mapBgEntriesApi(effectiveProjectDates.scl_bg ?? []),
      contractorBg: mapBgEntriesApi(effectiveProjectDates.contractor_bg ?? []),
      bgSummary: effectiveProjectDates.bg_summary ?? null,
    };
  }, [effectiveProjectDates]);

  const hasProjectDatesContent = Boolean(
    mappedProjectDates?.scl ||
      (mappedProjectDates?.contractors.length ?? 0) > 0 ||
      (mappedProjectDates?.sclBg.length ?? 0) > 0 ||
      (mappedProjectDates?.contractorBg.length ?? 0) > 0,
  );

  const showInitialSkeleton =
    cm.loading &&
    !cm.contractValues &&
    !cm.invoicing &&
    !effectiveProjectDates;

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

  if (showInitialSkeleton) {
    return (
      <div className={theme.root}>
        <CmLoadingSkeleton />
      </div>
    );
  }

  const projectDatesSection = showProjectDates ? (
    <div id="tl-section-project-dates" className="space-y-2">
      <ProjectDatesGroupCard
        sclData={mappedProjectDates?.scl ?? null}
        contractors={mappedProjectDates?.contractors ?? []}
        selectedContractorId={projectDatesContractorId}
        onSelectContractor={setProjectDatesContractorId}
        hideContractorSelector={false}
        sclBgEntries={mappedProjectDates?.sclBg ?? []}
        contractorBgEntries={mappedProjectDates?.contractorBg ?? []}
        bgSummary={mappedProjectDates?.bgSummary ?? null}
        isLoading={projectDatesCardLoading}
        sclError={
          !projectDatesCardLoading && !mappedProjectDates?.scl && cm.error
            ? cm.error
            : null
        }
        onEditScl={
          datesAccess.canEditDates && onEditSclDates
            ? () => onEditSclDates(effectiveProjectDates?.scl ?? null)
            : undefined
        }
        onEditContractor={
          datesAccess.canEditDates && onEditContractorDates
            ? (record) => {
                const apiRecord = effectiveProjectDates?.contractors.find((c) => c.id === record.id);
                if (apiRecord) onEditContractorDates(apiRecord);
              }
            : undefined
        }
        onAddContractor={datesAccess.canAddContractor ? onAddContractorSchedule : undefined}
        onDeleteContractor={
          datesAccess.canDeleteContractor ? onDeleteContractorSchedule : undefined
        }
        onManageBg={datesAccess.canManageBg && onManageBg ? handleManageBgScope : undefined}
      />
      {userRole ? (
        <ProjectEotSection
          projectName={project.title}
          role={userRole}
          seedDates={
            mappedProjectDates?.scl
              ? {
                  project_start: mappedProjectDates.scl.project_start,
                  contract_finish: mappedProjectDates.scl.contract_finish,
                  forecast_finish: mappedProjectDates.scl.forecast_finish,
                  eot_date: mappedProjectDates.scl.eot_date,
                }
              : null
          }
        />
      ) : null}
    </div>
  ) : null;

  return (
    <div className={`contractor-management-dashboard ${theme.root}`}>
      {projectDatesSection}

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
        {showFinancial && (cm.loading || cm.contractValues || cm.invoicing) && (
          <CmFinancialDashboardRow
            contractValues={cm.contractValues}
            invoicing={cm.invoicing}
            contractors={cm.masters}
            selectedContractorMasterId={cm.selectedContractorMasterId}
            contractorDisplayName={contractorLabel}
            selectedContractorContractValues={cm.selectedContractorContractValues}
            selectedContractorInvoicing={cm.selectedContractorInvoicing}
            loadingSelectedContractorFinancial={cm.loadingSelectedContractorFinancial}
            loadingFinancial={cm.loading}
            onNavigateFinancial={onNavigateFinancial}
          />
        )}
        {showFinancial && !cm.loading && !cm.contractValues && !cm.invoicing && (
          <div className={`${theme.panel} p-6 text-center`}>
            <p className={theme.emptyTitle}>No contract or invoicing data</p>
            <p className={`mt-0.5 ${theme.emptySubtitle}`}>
              {cm.error
                ? 'Financial records could not be loaded. Try Refresh above.'
                : 'Add contract values and invoicing records in Financial Management.'}
            </p>
          </div>
        )}
      </div>

      {cm.contractorCount === 0 && !cm.loading && !hasProjectDatesContent && !cm.contractValues && !cm.invoicing && (
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
