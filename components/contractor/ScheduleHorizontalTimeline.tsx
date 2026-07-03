import React from 'react';
import { Pencil } from 'lucide-react';
import type { ProjectDatesApiRecord } from '../../types/contractorManagement';
import type { BGEntry } from '../../types/bgStatus';
import { ProjectDatesPartyColumn } from '../ProjectDatesCard';
import { useTheme, getThemeClasses } from '../../utils/theme';
import { mapProjectDatesApiRecord } from '../../utils/contractorDashboardMappers';
import { useCmTheme } from './enterpriseTheme';

interface ScheduleHorizontalTimelineProps {
  title: string;
  record: ProjectDatesApiRecord;
  variant: 'SCL' | 'Contractor';
  bgEntries?: BGEntry[];
  highlighted?: boolean;
  onEdit?: () => void;
  onManageBg?: () => void;
  onSelect?: () => void;
}

const ScheduleHorizontalTimeline: React.FC<ScheduleHorizontalTimelineProps> = ({
  title,
  record,
  variant,
  bgEntries = [],
  highlighted = false,
  onEdit,
  onManageBg,
  onSelect,
}) => {
  const theme = useCmTheme();
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const mapped = mapProjectDatesApiRecord(record);
  const headerClass =
    variant === 'SCL' ? theme.timelineHeader.scl : theme.timelineHeader.contractor;

  return (
    <div
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={onSelect ? (e) => e.key === 'Enter' && onSelect() : undefined}
      className={`${theme.card} overflow-hidden ${highlighted ? 'ring-2 ring-indigo-500/50 shadow-md' : ''} ${
        onSelect ? 'cursor-pointer' : ''
      }`}
    >
      <div className={`flex items-center justify-between gap-2 px-3 py-2 sm:px-4 ${headerClass}`}>
        <h3 className={`truncate text-xs font-bold uppercase tracking-wide sm:text-sm ${theme.tc.textPrimary}`}>
          {title}
        </h3>
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={`${theme.btn.base} ${theme.btn.secondary} !h-7 !px-2.5 !py-0 !text-[10px]`}
          >
            <Pencil size={11} />
            Edit
          </button>
        )}
      </div>
      <ProjectDatesPartyColumn
        variant={variant}
        data={mapped}
        bgEntries={bgEntries}
        isLoading={false}
        error={null}
        onManageBg={onManageBg}
        themeClasses={themeClasses}
        isDarkTheme={isDarkTheme}
        layout="compact"
        partyDisplayTitle={title}
        showBgStrip={false}
      />
    </div>
  );
};

export default ScheduleHorizontalTimeline;
