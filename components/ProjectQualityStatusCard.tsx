import React, { useEffect, useState } from 'react';
import type { ProjectQualityStatusRecord } from '../types';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';
import { CardActionToolbar, CardEditButton, CardExpandButton, FormulaInfoButton } from './FormulaInfoButton';
import QualityCompactSummary from './QualityCompactSummary';
import QualityDetailedBody from './QualityDetailedBody';
import QualityMonthSelector from './QualityMonthSelector';
import QualityTrendChart from './QualityTrendChart';
import QualityMonthlyForm, { type QualityFormValues } from './QualityMonthlyForm';
import { DASHBOARD_FORMULAS } from '../utils/dashboardFormulas';
import {
  getQualityPerformanceStatus,
  monthYearLabel,
  qualityStatusBadgeClasses,
} from '../utils/qualityStatus';
import { DASHBOARD_STATUS_CARD_PADDING, getThemeClasses, useTheme } from '../utils/theme';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';

interface ProjectQualityStatusCardProps {
  projectName?: string;
  monthlyRecord: ProjectQualityStatusRecord | null;
  yearRecords: ProjectQualityStatusRecord[];
  selectedMonth: number;
  selectedYear: number;
  isLoading?: boolean;
  error?: string | null;
  isSaving?: boolean;
  formError?: string | null;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onSave: (values: QualityFormValues, record?: ProjectQualityStatusRecord | null) => Promise<boolean> | boolean;
  variant?: 'dashboard' | 'executive';
}

const QualityCardHeader: React.FC<{
  selectedMonth: number;
  selectedYear: number;
  performance?: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
  onExpand?: () => void;
  onEdit?: () => void;
  showExpand?: boolean;
  variant?: 'summary' | 'detailed';
}> = ({
  selectedMonth,
  selectedYear,
  performance = 0,
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
  const status = getQualityPerformanceStatus(performance);
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
            <Icons.Safety size={iconSize} />
          </span>
          <div className="min-w-0">
            <h3 className={typo.statusCardTitle}>
              Project Quality Status
            </h3>
            {!isSummary && (
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <p className={`${typo.caption} font-semibold ${themeClasses.textSecondary}`}>
                  {monthYearLabel(selectedMonth, selectedYear)}
                </p>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 ${typo.microBold} ${qualityStatusBadgeClasses[status.level]}`}
                >
                  {status.label}
                </span>
              </div>
            )}
          </div>
        </div>

        <CardActionToolbar>
          {!isSummary && (
            <div className="w-[min(100%,220px)] min-w-[160px]">
              <QualityMonthSelector
                compact
                month={selectedMonth}
                year={selectedYear}
                onMonthChange={onMonthChange}
                onYearChange={onYearChange}
              />
            </div>
          )}
          <FormulaInfoButton {...DASHBOARD_FORMULAS.projectQualityStatus} />
          {onEdit && <CardEditButton onClick={onEdit} title="Edit quality status" />}
          {isSummary && showExpand && onExpand && (
            <CardExpandButton onClick={onExpand} title="Expand Project Quality details" />
          )}
        </CardActionToolbar>
      </div>
    </div>
  );
};

const ProjectQualityStatusCard: React.FC<ProjectQualityStatusCardProps> = ({
  projectName = '',
  monthlyRecord,
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
  variant = 'dashboard',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const performance = monthlyRecord?.qualityPerformance ?? 0;

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
    performance,
    onMonthChange,
    onYearChange,
    onEdit: openEdit,
  };

  const renderContent = (mode: 'compact' | 'expanded') => {
    if (isLoading) {
      if (mode === 'compact') {
        return (
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`h-14 animate-pulse rounded-lg ${themeClasses.bgSecondary}`} />
              ))}
            </div>
            <div className={`h-28 animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
          </div>
        );
      }
      return (
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`h-20 animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
            ))}
          </div>
          <div className={`h-48 animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
        </div>
      );
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
            No quality data for {monthYearLabel(selectedMonth, selectedYear)}.
          </p>
          <button
            type="button"
            onClick={openEdit}
            disabled={!projectName}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Icons.Add size={12} />
            Add Record
          </button>
          {mode === 'expanded' && yearRecords.length > 0 && (
            <div className="mt-2 w-full">
              <QualityTrendChart records={yearRecords} year={selectedYear} />
            </div>
          )}
        </div>
      );
    }

    if (mode === 'compact') {
      return <QualityCompactSummary record={monthlyRecord} />;
    }

    return (
      <QualityDetailedBody record={monthlyRecord} yearRecords={yearRecords} selectedYear={selectedYear} />
    );
  };

  const formModal = isModalOpen ? (
    <QualityMonthlyForm
      projectName={projectName}
      record={monthlyRecord}
      existingRecords={yearRecords}
      isSaving={isSaving}
      error={formError}
      onClose={() => setIsModalOpen(false)}
      onSubmit={onSave}
    />
  ) : null;

  if (variant === 'executive') {
    return (
      <>
        <div className="quality-status-card flex flex-col px-3 pb-3 pt-2 sm:px-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1 sm:max-w-[280px]">
              <QualityMonthSelector
                compact
                month={selectedMonth}
                year={selectedYear}
                onMonthChange={onMonthChange}
                onYearChange={onYearChange}
              />
            </div>
            <CardActionToolbar>
              <FormulaInfoButton {...DASHBOARD_FORMULAS.projectQualityStatus} />
              <CardEditButton onClick={openEdit} title="Edit quality status" />
            </CardActionToolbar>
          </div>
          <div className="min-h-[220px]">{renderContent('compact')}</div>
        </div>
        {formModal}
      </>
    );
  }

  return (
    <>
      <div
        className={`quality-status-card joyride-target-stable relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border ${DASHBOARD_STATUS_CARD_PADDING} transition-shadow hover:shadow-md ${
          isDarkTheme
            ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
            : 'border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
        }`}
      >
        <DashboardCardTopAccent />
        <QualityCardHeader
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
              <QualityCardHeader {...headerProps} variant="detailed" showExpand={false} />
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

      {formModal}
    </>
  );
};

export default React.memo(ProjectQualityStatusCard);
