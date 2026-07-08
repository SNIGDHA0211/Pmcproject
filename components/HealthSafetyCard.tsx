import React, { useEffect, useMemo, useState } from 'react';
import type { HSERecord, HealthSafetyDashboardData, HealthSafetyYtdSummary } from '../services/api';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';
import { CardActionToolbar, CardEditButton, CardExpandButton, FormulaInfoButton } from './FormulaInfoButton';
import HealthSafetyMonthSelector from './HealthSafetyMonthSelector';
import HealthSafetyIncidentKpiCard from './HealthSafetyIncidentKpiCard';
import HealthSafetySummaryStrip from './HealthSafetySummaryStrip';
import HealthSafetyCompactSummary from './HealthSafetyCompactSummary';
import HealthSafetyPyramid from './HealthSafetyPyramid';
import HealthSafetyYtdSummarySection from './HealthSafetyYtdSummary';
import HealthSafetyTrendChart from './HealthSafetyTrendChart';
import HealthSafetyMonthlyForm, { type HealthSafetyFormValues } from './HealthSafetyMonthlyForm';
import { DASHBOARD_FORMULAS } from '../utils/dashboardFormulas';
import {
  INCIDENT_KPI_CONFIG,
  mergeHealthSafetyRecords,
  resolveHealthSafetyYtdSummary,
  toIncidentMetrics,
} from '../utils/healthSafety';
import { DASHBOARD_STATUS_CARD_PADDING, getThemeClasses, useTheme } from '../utils/theme';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';

interface HealthSafetyCardProps {
  projectName?: string;
  dashboard: HealthSafetyDashboardData | null;
  selectedMonth: number;
  selectedYear: number;
  isLoading: boolean;
  error?: string | null;
  isSaving?: boolean;
  formError?: string | null;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onSave: (values: HealthSafetyFormValues, record?: HSERecord | null) => Promise<boolean> | boolean;
  variant?: 'dashboard' | 'executive';
  /** Tighter layout when shown beside Material Testing Frequency Chart */
  pairLayout?: boolean;
}

const HealthSafetyCardHeader: React.FC<{
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
  onExpand?: () => void;
  onEdit?: () => void;
  showExpand?: boolean;
  variant?: 'summary' | 'detailed';
  pairLayout?: boolean;
}> = ({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onExpand,
  onEdit,
  showExpand = true,
  variant = 'detailed',
  pairLayout = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const isSummary = variant === 'summary';

  const iconSize = pairLayout ? 15 : isSummary ? 16 : 20;
  const iconWrap = pairLayout ? 'h-8 w-8' : isSummary ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div className={`flex shrink-0 flex-col border-b ${pairLayout ? 'gap-2 pb-2.5' : 'gap-2.5 pb-3'} pt-0.5 ${themeClasses.border}`}>
      <div className={`flex flex-wrap items-center justify-between ${pairLayout ? 'gap-2' : 'gap-3'}`}>
        <div className={`flex min-w-0 flex-1 items-center ${pairLayout ? 'gap-2' : 'gap-3'}`}>
          <span
            className={`flex ${iconWrap} flex-none items-center justify-center rounded-full ring-2 ${
              isDarkTheme
                ? 'bg-gradient-to-br from-blue-500/30 to-indigo-600/20 text-blue-200 ring-blue-400/20'
                : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 ring-blue-100'
            }`}
          >
            <Icons.Safety size={iconSize} />
          </span>
          <div className="min-w-0">
            <h3 className={pairLayout ? `${typo.statusCardTitle} text-xs sm:text-sm` : typo.statusCardTitle}>
              Health & Safety Status
            </h3>
          </div>
        </div>

        <CardActionToolbar>
          <FormulaInfoButton {...DASHBOARD_FORMULAS.healthSafety} />
          {onEdit && <CardEditButton onClick={onEdit} title="Edit Health & Safety" />}
          {isSummary && showExpand && onExpand && (
            <CardExpandButton onClick={onExpand} title="Expand Health and Safety details" />
          )}
        </CardActionToolbar>
      </div>

      {!isSummary && (
        <div
          className={`rounded-xl border-2 p-3 ${
            isDarkTheme
              ? 'border-blue-500/40 bg-blue-950/30'
              : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/80 shadow-sm'
          }`}
        >
          <p
            className={`mb-2 ${typo.headerEyebrow} ${
              isDarkTheme ? 'text-blue-300' : 'text-blue-700'
            }`}
          >
            Reporting period
          </p>
          <HealthSafetyMonthSelector
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={onMonthChange}
            onYearChange={onYearChange}
            prominent
          />
        </div>
      )}
    </div>
  );
};

const HealthSafetyCardBody: React.FC<{
  monthlyRecord: HSERecord;
  ytdSummary: HealthSafetyYtdSummary | null;
  trendRecords: HSERecord[];
  selectedYear: number;
  mode: 'compact' | 'expanded';
  pairLayout?: boolean;
}> = ({ monthlyRecord, ytdSummary, trendRecords, selectedYear, mode, pairLayout = false }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const metrics = toIncidentMetrics(monthlyRecord);
  const ytdMetrics = toIncidentMetrics(ytdSummary);

  if (mode === 'compact') {
    return <HealthSafetyCompactSummary record={monthlyRecord} pairLayout={pairLayout} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {INCIDENT_KPI_CONFIG.map((config) => (
          <HealthSafetyIncidentKpiCard
            key={config.key}
            metricKey={config.key}
            value={metrics[config.key]}
            variant="expanded"
          />
        ))}
      </div>

      <HealthSafetySummaryStrip record={monthlyRecord} variant="expanded" />

      {mode === 'expanded' && (
        <>
          <HealthSafetyYtdSummarySection
            year={selectedYear}
            summary={ytdSummary}
            variant="expanded"
          />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div
              className={`rounded-xl border p-4 ${
                isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
              }`}
            >
              <p className={`mb-3 text-sm font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                HSE Pyramid (YTD)
              </p>
              <HealthSafetyPyramid stats={ytdMetrics} />
            </div>
            <HealthSafetyTrendChart records={trendRecords} year={selectedYear} variant="lines" />
          </div>
        </>
      )}
    </div>
  );
};

const HealthSafetyCard: React.FC<HealthSafetyCardProps> = ({
  projectName = '',
  dashboard,
  selectedMonth,
  selectedYear,
  isLoading,
  error,
  isSaving = false,
  formError,
  onMonthChange,
  onYearChange,
  onSave,
  variant = 'dashboard',
  pairLayout = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HSERecord | null>(null);

  const monthlyRecord = useMemo(() => {
    if (!dashboard) return null;
    const fromList = dashboard.monthlyRecords.find(
      (row) => row.month === selectedMonth && row.year === selectedYear
    );
    if (fromList) return fromList;
    if (
      dashboard.currentMonth?.month === selectedMonth &&
      dashboard.currentMonth?.year === selectedYear
    ) {
      return dashboard.currentMonth;
    }
    return null;
  }, [dashboard, selectedMonth, selectedYear]);

  const trendRecords = useMemo(
    () => mergeHealthSafetyRecords(dashboard?.monthlyRecords ?? [], dashboard?.currentMonth),
    [dashboard?.monthlyRecords, dashboard?.currentMonth]
  );

  const ytdSummary = useMemo(
    () => resolveHealthSafetyYtdSummary(dashboard?.ytdSummary, trendRecords, selectedYear),
    [dashboard?.ytdSummary, trendRecords, selectedYear]
  );

  const openCreate = () => {
    setEditingRecord(
      monthlyRecord ?? {
        projectName,
        month: selectedMonth,
        year: selectedYear,
        fatalities: 0,
        significant: 0,
        major: 0,
        minor: 0,
        nearMiss: 0,
        totalManhours: 0,
        lossOfManhours: 0,
      }
    );
    setIsModalOpen(true);
  };

  const openEdit = () => {
    setEditingRecord(monthlyRecord);
    setIsModalOpen(true);
  };

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
    onMonthChange,
    onYearChange,
    onEdit: openEdit,
  };

  const renderContent = (mode: 'compact' | 'expanded') => {
    if (isLoading) {
      if (mode === 'compact') {
        return (
          <div className="flex h-full min-h-0 flex-1 flex-col py-1">
            <div className={`min-h-0 flex-1 animate-pulse rounded-lg ${themeClasses.bgSecondary}`} />
            <div className="mt-auto grid shrink-0 grid-cols-2 gap-2.5">
              <div className={`h-[58px] animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
              <div className={`h-[58px] animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`h-[88px] animate-pulse rounded-lg ${themeClasses.bgSecondary}`} />
            ))}
          </div>
          <div className={`h-24 animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex min-h-[200px] items-center justify-center text-sm font-bold text-rose-500">{error}</div>
      );
    }
    if (!monthlyRecord) {
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 text-center">
          <p className={`text-sm font-black uppercase tracking-widest ${themeClasses.textMuted}`}>
            No Health & Safety records for selected month.
          </p>
          <button
            type="button"
            onClick={openCreate}
            disabled={!projectName}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Icons.Add size={12} />
            Add Record
          </button>
        </div>
      );
    }
    return (
      <HealthSafetyCardBody
        monthlyRecord={monthlyRecord}
        ytdSummary={ytdSummary}
        trendRecords={trendRecords}
        selectedYear={selectedYear}
        mode={mode}
        pairLayout={pairLayout}
      />
    );
  };

  const formModal = isModalOpen ? (
    <HealthSafetyMonthlyForm
      projectName={projectName}
      record={editingRecord}
      existingRecords={dashboard?.monthlyRecords ?? []}
      isSaving={isSaving}
      error={formError}
      onClose={() => setIsModalOpen(false)}
      onSubmit={onSave}
    />
  ) : null;

  if (variant === 'executive') {
    return (
      <>
        <div className="hse-status-card flex flex-col px-3 pb-3 pt-2 sm:px-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1 sm:max-w-[280px]">
              <HealthSafetyMonthSelector
                compact
                month={selectedMonth}
                year={selectedYear}
                onMonthChange={onMonthChange}
                onYearChange={onYearChange}
              />
            </div>
            <CardActionToolbar>
              <FormulaInfoButton {...DASHBOARD_FORMULAS.healthSafety} />
              <CardEditButton onClick={openEdit} title="Edit Health & Safety" />
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
        className={`hse-status-card joyride-target-stable relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-lg ${
          pairLayout ? 'min-h-[22rem] px-4 py-3' : DASHBOARD_STATUS_CARD_PADDING
        } ${
          isDarkTheme
            ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
            : 'border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)] ring-1 ring-slate-100'
        }`}
      >
        <DashboardCardTopAccent />
        <HealthSafetyCardHeader
          {...headerProps}
          variant="summary"
          onExpand={() => setIsExpanded(true)}
          showExpand
          pairLayout={pairLayout}
        />
        <div className={`min-h-0 flex-1 ${pairLayout ? 'mt-2.5' : 'mt-3'}`}>{renderContent('compact')}</div>
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
              <HealthSafetyCardHeader
                {...headerProps}
                variant="detailed"
                showExpand={false}
              />
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

export default React.memo(HealthSafetyCard);
