import React, { useEffect, useState } from 'react';
import type { DrawingMonthlyRecord, DrawingProjectSummary as DrawingProjectSummaryData } from '../types';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';
import { CardActionToolbar, CardEditButton, CardExpandButton, FormulaInfoButton } from './FormulaInfoButton';
import DrawingCompactSummary from './DrawingCompactSummary';
import DrawingDetailedBody from './DrawingDetailedBody';
import DrawingMonthSelector from './DrawingMonthSelector';
import DrawingProjectSummary from './DrawingProjectSummary';
import DrawingTrendChart from './DrawingTrendChart';
import DrawingMonthlyForm, { type DrawingFormValues } from './DrawingMonthlyForm';
import {
  drawingTrackingBadgeClasses,
  getDrawingTrackingStatus,
  monthYearLabel,
} from '../utils/drawingSummary';
import { DASHBOARD_STATUS_CARD_PADDING, getThemeClasses, useTheme } from '../utils/theme';
import { CardLoadingSkeleton } from './WorkspaceStatusPanels';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';

interface DrawingSummaryCardProps {
  projectName?: string;
  monthlyRecord: DrawingMonthlyRecord | null;
  projectSummary: DrawingProjectSummaryData | null;
  yearRecords: DrawingMonthlyRecord[];
  selectedMonth: number;
  selectedYear: number;
  isLoading?: boolean;
  error?: string | null;
  isSaving?: boolean;
  formError?: string | null;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onSave: (values: DrawingFormValues, record?: DrawingMonthlyRecord | null) => Promise<boolean> | boolean;
}

const DrawingCardHeader: React.FC<{
  selectedMonth: number;
  selectedYear: number;
  approvalRate: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
  onExpand?: () => void;
  onEdit?: () => void;
  showExpand?: boolean;
  variant?: 'summary' | 'detailed';
}> = ({
  selectedMonth,
  selectedYear,
  approvalRate,
  onMonthChange,
  onYearChange,
  onExpand,
  onEdit,
  showExpand = true,
  variant = 'detailed',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const isSummary = variant === 'summary';
  const tracking = getDrawingTrackingStatus(approvalRate);
  const iconSize = isSummary ? 16 : 20;
  const iconWrap = isSummary ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div className={`flex shrink-0 flex-col gap-2.5 border-b pb-3 pt-0.5 ${themeClasses.border}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={`flex ${iconWrap} flex-none items-center justify-center rounded-full ${
              isDarkTheme ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700'
            }`}
          >
            <Icons.Document size={iconSize} />
          </span>
          <div className="min-w-0">
            <h3 className={typo.statusCardTitle}>
              Drawings Summary
            </h3>
            {!isSummary && (
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <p className={`${typo.caption} font-semibold ${themeClasses.textPrimary}`}>
                  {monthYearLabel(selectedMonth, selectedYear)}
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${typo.microBold} ${drawingTrackingBadgeClasses[tracking.level]}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
                  {tracking.label}
                </span>
              </div>
            )}
          </div>
        </div>

        <CardActionToolbar>
          {!isSummary && (
            <div className="w-[min(100%,220px)] min-w-[160px]">
              <DrawingMonthSelector
                compact
                month={selectedMonth}
                year={selectedYear}
                onMonthChange={onMonthChange}
                onYearChange={onYearChange}
              />
            </div>
          )}
          <FormulaInfoButton
            title="Drawings Summary Formula"
            calculatedFields={['variance', 'approvalRate']}
            formulas={[
              'variance = submittedDrawings − approvedDrawings',
              'approvalRate = (approvedDrawings / submittedDrawings) × 100',
            ]}
            statusRules={[
              'ON TRACK: approval rate ≥ 85%',
              'ATTENTION: 70–84%',
              'AT RISK: below 70%',
            ]}
          />
          {onEdit && <CardEditButton onClick={onEdit} title="Edit drawings summary" />}
          {isSummary && showExpand && onExpand && (
            <CardExpandButton onClick={onExpand} title="Expand Drawings Summary" />
          )}
        </CardActionToolbar>
      </div>
    </div>
  );
};

const DrawingSummaryCard: React.FC<DrawingSummaryCardProps> = ({
  projectName = '',
  monthlyRecord,
  projectSummary,
  yearRecords,
  selectedMonth,
  selectedYear,
  isLoading = false,
  error,
  isSaving = false,
  formError,
  onMonthChange,
  onYearChange,
  onSave,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const approvalRate = monthlyRecord?.approvalRate ?? 0;

  const openEdit = () => setIsModalOpen(true);

  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isExpanded]);

  const headerProps = {
    selectedMonth,
    selectedYear,
    approvalRate,
    onMonthChange,
    onYearChange,
    onEdit: openEdit,
  };

  const renderContent = (mode: 'compact' | 'expanded') => {
    if (isLoading) {
      if (mode === 'compact') {
        return <CardLoadingSkeleton metrics={4} chartHeight={112} />;
      }
      return <CardLoadingSkeleton metrics={4} chartHeight={256} />;
    }

    if (error) {
      return (
        <div className="flex min-h-[160px] items-center justify-center text-sm font-bold text-rose-500">{error}</div>
      );
    }

    if (!monthlyRecord) {
      return (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 text-center">
          <p className={`text-sm font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
            No drawing data for {monthYearLabel(selectedMonth, selectedYear)}.
          </p>
          <button
            type="button"
            onClick={openEdit}
            disabled={!projectName}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Icons.Add size={12} />
            Add Monthly Record
          </button>
          {mode === 'expanded' && (
            <>
              <DrawingProjectSummary summary={projectSummary} />
              {yearRecords.length > 0 && <DrawingTrendChart records={yearRecords} year={selectedYear} />}
            </>
          )}
        </div>
      );
    }

    if (mode === 'compact') {
      return <DrawingCompactSummary record={monthlyRecord} />;
    }

    return (
      <DrawingDetailedBody
        monthlyRecord={monthlyRecord}
        projectSummary={projectSummary}
        yearRecords={yearRecords}
        selectedYear={selectedYear}
      />
    );
  };

  return (
    <>
      <div
        className={`drawings-card joyride-target-stable relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border ${DASHBOARD_STATUS_CARD_PADDING} transition-shadow hover:shadow-md ${
          isDarkTheme
            ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
            : 'border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
        }`}
      >
        <DashboardCardTopAccent />
        <DrawingCardHeader
          {...headerProps}
          variant="summary"
          onExpand={() => setIsExpanded(true)}
          showExpand
        />
        <div className="mt-3">{renderContent('compact')}</div>
      </div>

      <ModalPortal open={isExpanded}>
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setIsExpanded(false)}
        >
          <div
            className={`flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${
              isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-y-auto p-5">
              <DrawingCardHeader {...headerProps} variant="detailed" showExpand={false} />
              {renderContent('expanded')}
            </div>
            <div className={`flex shrink-0 justify-end border-t px-5 py-3 ${themeClasses.border}`}>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${themeClasses.buttonSecondary}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {isModalOpen && (
        <DrawingMonthlyForm
          projectName={projectName}
          record={monthlyRecord}
          existingRecords={yearRecords}
          isSaving={isSaving}
          error={formError}
          onClose={() => setIsModalOpen(false)}
          onSubmit={onSave}
        />
      )}
    </>
  );
};

export default React.memo(DrawingSummaryCard);
