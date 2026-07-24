import React from 'react';
import type { UserRole } from '../../types';
import type { ProjectDatesRecord } from '../../services/api';
import type { BGEntry, BGSummary } from '../../types/bgStatus';
import type { BgManageScope } from '../ProjectDatesCard';
import { ProjectDatesGroupCard } from '../ProjectDatesCard';
import { usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';
import { getProjectDatesSectionAccess } from '../../utils/pmcRoleAccess';

export const PMCExecutivePanel: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}> = ({ title, subtitle, children, className = '', headerRight }) => {
  const ex = usePmcExecutiveTheme();

  return (
    <div className={`${ex.panel} ${className}`}>
      <div className={`${ex.panelHeader} flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <h3 className={ex.panelTitle}>{title}</h3>
          {subtitle && <p className={ex.panelSubtitle}>{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      <div className="pmc-executive-panel-body [&_.dashboard-card-top-accent]:hidden [&>div]:!rounded-none [&>div]:!border-0 [&>div]:!shadow-none">
        {children}
      </div>
    </div>
  );
};

interface PMCHeadScheduleSectionProps {
  role: UserRole;
  projectName?: string;
  scl: ProjectDatesRecord | null;
  contractors: ProjectDatesRecord[];
  selectedContractorId: number | null;
  onSelectContractor: (id: number) => void;
  hideContractorSelector?: boolean;
  sclBgEntries?: BGEntry[];
  contractorBgEntries?: BGEntry[];
  bgSummary?: BGSummary | null;
  isLoading?: boolean;
  error?: string | null;
  onEditScl?: () => void;
  onEditContractor?: (record: ProjectDatesRecord) => void;
  onAddContractor?: () => void;
  onDeleteContractor?: (record: ProjectDatesRecord) => void;
  onManageBg?: (scope: BgManageScope) => void;
  children?: React.ReactNode;
}

const PMCHeadScheduleSection: React.FC<PMCHeadScheduleSectionProps> = ({
  role,
  projectName,
  scl,
  contractors,
  selectedContractorId,
  onSelectContractor,
  hideContractorSelector = false,
  sclBgEntries = [],
  contractorBgEntries = [],
  bgSummary = null,
  isLoading = false,
  error = null,
  onEditScl,
  onEditContractor,
  onAddContractor,
  onDeleteContractor,
  onManageBg,
  children,
}) => {
  const ex = usePmcExecutiveTheme();
  const access = getProjectDatesSectionAccess(role);

  return (
    <div className="space-y-3 sm:space-y-4">
      {projectName ? (
        <div className="min-w-0 px-0.5">
          <h2
            className={`truncate text-lg font-black tracking-tight sm:text-xl ${ex.heading}`}
            title={projectName}
          >
            {projectName}
          </h2>
          <p className={`mt-0.5 text-xs font-semibold ${ex.muted}`}>Schedule & Dates</p>
        </div>
      ) : null}

      <ProjectDatesGroupCard
        sclData={scl}
        contractors={contractors}
        selectedContractorId={selectedContractorId}
        onSelectContractor={onSelectContractor}
        hideContractorSelector={hideContractorSelector}
        sclBgEntries={sclBgEntries}
        contractorBgEntries={contractorBgEntries}
        bgSummary={bgSummary}
        isLoading={isLoading}
        sclError={error}
        contractorError={error}
        onEditScl={access.canEditDates ? onEditScl : undefined}
        onEditContractor={access.canEditDates ? onEditContractor : undefined}
        onAddContractor={access.canAddContractor ? onAddContractor : undefined}
        onDeleteContractor={access.canDeleteContractor ? onDeleteContractor : undefined}
        onManageBg={access.canManageBg ? onManageBg : undefined}
      />

      {children}
    </div>
  );
};

export default PMCHeadScheduleSection;
