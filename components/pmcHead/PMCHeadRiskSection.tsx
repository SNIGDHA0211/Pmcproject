import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  Clock3,
  Pencil,
  Shield,
  TriangleAlert,
} from 'lucide-react';
import type { HSERecord, HealthSafetyDashboardData } from '../../services/api';
import type { ProjectQualityStatusRecord } from '../../types';
import type { BottleneckItem } from '../../utils/bottleneck';
import { countOpenByType } from '../../utils/bottleneck';
import {
  getHealthSafetyStatus,
  monthYearLabel,
  statusBadgeClasses,
  toIncidentMetrics,
} from '../../utils/healthSafety';
import {
  getQualityPerformanceBarTone,
  getQualityPerformanceStatus,
  getQualityPerformanceTextTone,
  qualityPerformanceSummaryBadge,
} from '../../utils/qualityStatus';
import HealthSafetyPyramid from '../HealthSafetyPyramid';
import HealthSafetyMonthSelector from '../HealthSafetyMonthSelector';
import HealthSafetyMonthlyForm, {
  type HealthSafetyFormValues,
} from '../HealthSafetyMonthlyForm';
import QualityMonthSelector from '../QualityMonthSelector';
import QualityMonthlyForm, { type QualityFormValues } from '../QualityMonthlyForm';
import BottleneckSection from '../BottleneckSection';
import { PMCExecutivePanel } from './PMCHeadScheduleSection';
import { getPmcExecutiveTheme, pmcRiskPulseTone, usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';

const RISK_PULSE = [
  { key: 'ISSUE' as const, label: 'Issues', icon: AlertTriangle, tone: 'rose' as const, bg: 'bg-rose-500' },
  { key: 'CONCERN' as const, label: 'Concerns', icon: AlertCircle, tone: 'amber' as const, bg: 'bg-amber-500' },
  { key: 'RISK' as const, label: 'Risks', icon: Shield, tone: 'yellow' as const, bg: 'bg-yellow-500' },
  { key: 'ACTION' as const, label: 'Actions', icon: ClipboardList, tone: 'emerald' as const, bg: 'bg-emerald-500' },
];

const RiskPulseStrip: React.FC<{ items: BottleneckItem[] }> = ({ items }) => {
  const ex = usePmcExecutiveTheme();
  return (
  <div className={ex.pulseStrip}>
    <div className="grid grid-cols-2 sm:grid-cols-4">
      {RISK_PULSE.map(({ key, label, icon: Icon, tone, bg }, index) => (
        <div
          key={key}
          className={`flex items-center gap-2.5 px-3 py-2.5 sm:px-4 sm:py-3 ${
            index > 0 ? `sm:border-l ${ex.pulseCellBorder}` : ''
          } ${index >= 2 ? `border-t sm:border-t-0 ${ex.pulseCellBorder}` : ''}`}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ex.pulseIconBg} ${pmcRiskPulseTone(tone, ex.isDark)}`}>
            <Icon size={16} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-wide ${ex.label}`}>{label}</p>
            <p className={`text-xl font-black tabular-nums leading-tight sm:text-2xl ${pmcRiskPulseTone(tone, ex.isDark)}`}>
              {countOpenByType(items, key)}
            </p>
          </div>
          <span className={`ml-auto hidden h-8 w-1 shrink-0 rounded-full sm:block ${bg}`} />
        </div>
      ))}
    </div>
  </div>
  );
};

const PanelToolbar: React.FC<{
  children: React.ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}> = ({ children, onEdit, editLabel = 'Edit' }) => {
  const ex = usePmcExecutiveTheme();
  return (
  <div className={`mb-3 flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between ${ex.toolbarBorder}`}>
    <div className="min-w-0 flex-1">{children}</div>
    {onEdit && (
      <button type="button" onClick={onEdit} className={ex.toolbarBtn}>
        <Pencil size={12} />
        {editLabel}
      </button>
    )}
  </div>
  );
};

const ExecutiveHsePanel: React.FC<{
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
}> = ({
  projectName = '',
  dashboard,
  selectedMonth,
  selectedYear,
  isLoading,
  error,
  isSaving,
  formError,
  onMonthChange,
  onYearChange,
  onSave,
}) => {
  const ex = usePmcExecutiveTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HSERecord | null>(null);

  const monthlyRecord = useMemo(() => {
    if (!dashboard) return null;
    const fromList = dashboard.monthlyRecords.find(
      (row) => row.month === selectedMonth && row.year === selectedYear,
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

  const openEdit = () => {
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
      },
    );
    setIsModalOpen(true);
  };

  const hseStatus = monthlyRecord ? getHealthSafetyStatus(monthlyRecord) : null;

  return (
    <>
      <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <PanelToolbar onEdit={openEdit} editLabel="Edit HSE">
          <div className="flex flex-wrap items-center gap-2">
            <HealthSafetyMonthSelector
              compact
              month={selectedMonth}
              year={selectedYear}
              onMonthChange={onMonthChange}
              onYearChange={onYearChange}
            />
            {hseStatus && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClasses[hseStatus.level]}`}
              >
                {hseStatus.label}
              </span>
            )}
          </div>
        </PanelToolbar>

        {isLoading ? (
          <div className={`h-[168px] animate-pulse rounded-xl ${ex.skeleton}`} />
        ) : error ? (
          <p className={`py-8 text-center text-sm font-semibold ${ex.roseText}`}>{error}</p>
        ) : !monthlyRecord ? (
          <div className={`flex h-[168px] flex-col items-center justify-center text-center ${ex.emptyState}`}>
            <p className="text-xs font-semibold">No HSE data for this period</p>
            <button
              type="button"
              onClick={openEdit}
              className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-blue-700"
            >
              Add record
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className={`${ex.hsePyramidWrap} [&>div]:h-full [&>div]:rounded-none [&>div]:border-0 [&>div]:p-2 [&>div]:shadow-none`}>
              <HealthSafetyPyramid stats={toIncidentMetrics(monthlyRecord)} variant="summary" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className={ex.manhoursCard}>
                <Clock3 size={15} className={`shrink-0 ${ex.isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <div className="min-w-0">
                  <p className={`text-[9px] font-bold uppercase tracking-wide ${ex.isDark ? 'text-blue-400/80' : 'text-blue-600/80'}`}>
                    Total Manhours
                  </p>
                  <p className={`text-lg font-black tabular-nums ${ex.slateValue}`}>
                    {monthlyRecord.totalManhours.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <div className={ex.lossHoursCard}>
                <TriangleAlert size={15} className={`shrink-0 ${ex.roseText}`} />
                <div className="min-w-0">
                  <p className={`text-[9px] font-bold uppercase tracking-wide ${ex.isDark ? 'text-rose-400/80' : 'text-rose-600/80'}`}>
                    Loss Manhours
                  </p>
                  <p className={`text-lg font-black tabular-nums ${ex.slateValue}`}>
                    {monthlyRecord.lossOfManhours.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <HealthSafetyMonthlyForm
          projectName={projectName}
          record={editingRecord}
          existingRecords={dashboard?.monthlyRecords ?? []}
          isSaving={isSaving ?? false}
          error={formError}
          onClose={() => setIsModalOpen(false)}
          onSubmit={onSave}
        />
      )}
    </>
  );
};

const ExecutiveQualityPanel: React.FC<{
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
  onSave: (
    values: QualityFormValues,
    record?: ProjectQualityStatusRecord | null,
  ) => Promise<boolean> | boolean;
}> = ({
  projectName = '',
  monthlyRecord,
  yearRecords,
  selectedMonth,
  selectedYear,
  isLoading,
  error,
  isSaving,
  formError,
  onMonthChange,
  onYearChange,
  onSave,
}) => {
  const ex = usePmcExecutiveTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const performance = Math.min(100, Math.max(0, monthlyRecord?.qualityPerformance ?? 0));
  const status = getQualityPerformanceStatus(performance);
  const performanceTone = getQualityPerformanceTextTone(performance);

  return (
    <>
      <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <PanelToolbar onEdit={() => setIsModalOpen(true)} editLabel="Edit Quality">
          <QualityMonthSelector
            compact
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={onMonthChange}
            onYearChange={onYearChange}
          />
        </PanelToolbar>

        {isLoading ? (
          <div className={`h-[168px] animate-pulse rounded-xl ${ex.skeleton}`} />
        ) : error ? (
          <p className={`py-8 text-center text-sm font-semibold ${ex.roseText}`}>{error}</p>
        ) : !monthlyRecord ? (
          <div className={`flex h-[168px] flex-col items-center justify-center ${ex.emptyState}`}>
            <p className="text-xs font-semibold">No quality data for this period</p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-blue-700"
            >
              Add record
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Required', value: monthlyRecord.testsRequired, tone: 'text-slate-800' },
                { label: 'Conducted', value: monthlyRecord.testsConducted, tone: 'text-blue-700' },
                { label: 'Shortfall', value: monthlyRecord.shortfall, tone: monthlyRecord.shortfall === 0 ? 'text-emerald-600' : 'text-amber-600' },
                { label: 'Performance', value: `${performance.toFixed(1)}%`, tone: performanceTone },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`px-2.5 py-2 text-center sm:px-3 ${ex.statCard}`}
                >
                  <p className={`text-[9px] font-bold uppercase tracking-wide ${ex.label}`}>
                    {item.label}
                  </p>
                  <p className={`mt-0.5 text-base font-black tabular-nums sm:text-lg ${item.tone}`}>
                    {typeof item.value === 'number'
                      ? item.value.toLocaleString('en-IN')
                      : item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black tabular-nums sm:text-3xl ${performanceTone}`}>
                    {performance.toFixed(1)}%
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Quality</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${qualityPerformanceSummaryBadge[status.level]}`}
                >
                  {status.label}
                </span>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${getQualityPerformanceBarTone(performance)}`}
                  style={{ width: `${performance}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <QualityMonthlyForm
          projectName={projectName}
          record={monthlyRecord}
          existingRecords={yearRecords}
          isSaving={isSaving ?? false}
          error={formError}
          onClose={() => setIsModalOpen(false)}
          onSubmit={onSave}
        />
      )}
    </>
  );
};

export interface PMCHeadRiskSectionProps {
  bottleneckItems: BottleneckItem[];
  onBottleneckChange: (items: BottleneckItem[]) => void;
  onBottleneckSave: () => Promise<boolean> | boolean;
  isSavingBottleneck?: boolean;
  bottleneckDisabled?: boolean;
  projectLogsRef?: React.RefObject<HTMLDivElement | null>;
  healthSafetyDashboard: HealthSafetyDashboardData | null;
  healthSafetySelectedMonth: number;
  healthSafetySelectedYear: number;
  isLoadingHealthSafety: boolean;
  healthSafetyError?: string | null;
  isSavingHealthSafety?: boolean;
  healthSafetyFormError?: string | null;
  onHealthSafetyMonthChange: (month: number) => void;
  onHealthSafetyYearChange: (year: number) => void;
  onSaveHealthSafety: (
    values: HealthSafetyFormValues,
    record?: HSERecord | null,
  ) => Promise<boolean> | boolean;
  projectName?: string;
  qualityMonthlyRecord: ProjectQualityStatusRecord | null;
  qualityYearRecords: ProjectQualityStatusRecord[];
  qualitySelectedMonth: number;
  qualitySelectedYear: number;
  isLoadingQualityStatus?: boolean;
  qualityStatusError?: string | null;
  isSavingQualityStatus?: boolean;
  qualityStatusFormError?: string | null;
  onQualityMonthChange: (month: number) => void;
  onQualityYearChange: (year: number) => void;
  onSaveQualityStatus: (
    values: QualityFormValues,
    record?: ProjectQualityStatusRecord | null,
  ) => Promise<boolean> | boolean;
}

const PMCHeadRiskSection: React.FC<PMCHeadRiskSectionProps> = ({
  bottleneckItems,
  onBottleneckChange,
  onBottleneckSave,
  isSavingBottleneck = false,
  bottleneckDisabled = false,
  projectLogsRef,
  healthSafetyDashboard,
  healthSafetySelectedMonth,
  healthSafetySelectedYear,
  isLoadingHealthSafety,
  healthSafetyError,
  isSavingHealthSafety,
  healthSafetyFormError,
  onHealthSafetyMonthChange,
  onHealthSafetyYearChange,
  onSaveHealthSafety,
  projectName,
  qualityMonthlyRecord,
  qualityYearRecords,
  qualitySelectedMonth,
  qualitySelectedYear,
  isLoadingQualityStatus,
  qualityStatusError,
  isSavingQualityStatus,
  qualityStatusFormError,
  onQualityMonthChange,
  onQualityYearChange,
  onSaveQualityStatus,
}) => {
  const hsePeriod = monthYearLabel(healthSafetySelectedMonth, healthSafetySelectedYear);
  const qualityPeriod = monthYearLabel(qualitySelectedMonth, qualitySelectedYear);

  return (
    <div className="space-y-3">
      <RiskPulseStrip items={bottleneckItems} />

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
        <PMCExecutivePanel
          title="Health & Safety"
          subtitle={`Incident pyramid · ${hsePeriod}`}
          className="h-full"
        >
          <ExecutiveHsePanel
            projectName={projectName}
            dashboard={healthSafetyDashboard}
            selectedMonth={healthSafetySelectedMonth}
            selectedYear={healthSafetySelectedYear}
            isLoading={isLoadingHealthSafety}
            error={healthSafetyError}
            isSaving={isSavingHealthSafety}
            formError={healthSafetyFormError}
            onMonthChange={onHealthSafetyMonthChange}
            onYearChange={onHealthSafetyYearChange}
            onSave={onSaveHealthSafety}
          />
        </PMCExecutivePanel>

        <PMCExecutivePanel
          title="Project Quality"
          subtitle={`Testing performance · ${qualityPeriod}`}
          className="h-full"
        >
          <ExecutiveQualityPanel
            projectName={projectName}
            monthlyRecord={qualityMonthlyRecord}
            yearRecords={qualityYearRecords}
            selectedMonth={qualitySelectedMonth}
            selectedYear={qualitySelectedYear}
            isLoading={isLoadingQualityStatus}
            error={qualityStatusError}
            isSaving={isSavingQualityStatus}
            formError={qualityStatusFormError}
            onMonthChange={onQualityMonthChange}
            onYearChange={onQualityYearChange}
            onSave={onSaveQualityStatus}
          />
        </PMCExecutivePanel>
      </div>

      <PMCExecutivePanel
        title="Decision Bottleneck"
        subtitle="Issues, concerns, risks & leadership actions"
      >
        <div className="pmc-risk-bottleneck [&_.bottleneck-card]:border-0 [&_.bottleneck-card]:shadow-none">
          <BottleneckSection
            embedMode
            cardRef={projectLogsRef}
            items={bottleneckItems}
            onChange={onBottleneckChange}
            onSave={onBottleneckSave}
            isSaving={isSavingBottleneck}
            disabled={bottleneckDisabled}
          />
        </div>
      </PMCExecutivePanel>
    </div>
  );
};

export default PMCHeadRiskSection;
