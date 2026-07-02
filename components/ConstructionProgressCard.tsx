import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ConstructionProgressRecord } from '../types';
import { Icons } from './Icons';
import { CardHeaderActions, CardEditButton, FormulaInfoButton } from './FormulaInfoButton';
import { ModalPortal } from './ModalPortal';
import { DASHBOARD_FORMULAS } from '../utils/dashboardFormulas';
import { getThemeClasses, useTheme } from '../utils/theme';

export type ProgressFormValues = {
  progressMonth: string;
  plannedProgress: number;
  actualProgress: number;
  remarks: string;
};

interface ProgressDonutChartProps {
  planned: number;
  actual: number;
}

interface MonthlyProgressTableProps {
  records: ConstructionProgressRecord[];
  onEdit: (record: ConstructionProgressRecord) => void;
}

interface ProgressFormModalProps {
  projectName: string;
  record?: ConstructionProgressRecord | null;
  existingRecords: ConstructionProgressRecord[];
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: ProgressFormValues, record?: ConstructionProgressRecord | null) => Promise<boolean> | boolean;
}

interface ConstructionProgressCardProps {
  projectName?: string;
  records: ConstructionProgressRecord[];
  isLoading: boolean;
  error?: string | null;
  isSaving?: boolean;
  formError?: string | null;
  onSave: (values: ProgressFormValues, record?: ConstructionProgressRecord | null) => Promise<boolean> | boolean;
}

const pct = (value: number) => `${Number.isFinite(value) ? value.toFixed(2) : '0.00'}%`;

const monthLabel = (value: string) => {
  if (!value) return '-';
  const [year, month] = value.slice(0, 7).split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const sortByMonth = (records: ConstructionProgressRecord[]) =>
  [...records].sort((a, b) => a.progressMonth.localeCompare(b.progressMonth));

export const ProgressDonutChart: React.FC<ProgressDonutChartProps> = ({ planned, actual }) => {
  const plannedValue = Math.max(0, Math.min(planned, 100));
  const actualValue = Math.max(0, Math.min(actual, 100));
  const plannedData = [
    { name: 'Planned', value: plannedValue, color: '#4f46e5' },
    { name: 'Remaining', value: Math.max(0, 100 - plannedValue), color: 'rgba(148,163,184,0.18)' },
  ];
  const actualData = [
    { name: 'Actual', value: actualValue, color: '#f59e0b' },
    { name: 'Remaining', value: Math.max(0, 100 - actualValue), color: 'rgba(148,163,184,0.12)' },
  ];

  return (
    <div className="relative mx-auto h-[150px] w-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={plannedData} dataKey="value" startAngle={90} endAngle={-270} innerRadius={52} outerRadius={68} stroke="none">
            {plannedData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <Pie data={actualData} dataKey="value" startAngle={90} endAngle={-270} innerRadius={34} outerRadius={48} stroke="none">
            {actualData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Actual</span>
        <span className="text-xl font-black text-orange-400">{Math.round(actualValue)}%</span>
      </div>
    </div>
  );
};

export const MonthlyProgressTable: React.FC<MonthlyProgressTableProps> = ({ records, onEdit }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div className={`overflow-x-auto rounded-xl border ${themeClasses.border}`}>
      <table className="w-full min-w-[520px] text-[9px] border-collapse">
        <thead>
          <tr className={isDarkTheme ? 'bg-blue-900/30' : 'bg-blue-50/70'}>
            <th className={`px-2 py-2 text-left font-black uppercase ${themeClasses.textPrimary}`}>Month</th>
            <th className={`px-2 py-2 text-right font-black uppercase ${themeClasses.textPrimary}`}>Planned</th>
            <th className={`px-2 py-2 text-right font-black uppercase ${themeClasses.textPrimary}`}>Actual</th>
            <th className={`px-2 py-2 text-right font-black uppercase ${themeClasses.textPrimary}`}>Variance</th>
            <th className={`px-2 py-2 text-right font-black uppercase ${themeClasses.textPrimary}`}>Performance</th>
            <th className={`px-2 py-2 text-right font-black uppercase ${themeClasses.textPrimary}`}>Edit</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id ?? record.progressMonth} className={`border-t ${themeClasses.border}`}>
              <td className={`px-2 py-2 font-bold ${themeClasses.textPrimary}`}>{monthLabel(record.progressMonth)}</td>
              <td className={`px-2 py-2 text-right font-bold ${themeClasses.textPrimary}`}>{pct(record.plannedProgress)}</td>
              <td className={`px-2 py-2 text-right font-bold ${themeClasses.textPrimary}`}>{pct(record.actualProgress)}</td>
              <td className={`px-2 py-2 text-right font-black ${record.variance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{pct(record.variance)}</td>
              <td className={`px-2 py-2 text-right font-bold ${themeClasses.textPrimary}`}>{pct(record.performancePercentage)}</td>
              {/* <td className="px-2 py-1 text-right">
                <CardEditButton onClick={() => onEdit(record)} title="Edit progress" />
              </td> */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const ProgressFormModal: React.FC<ProgressFormModalProps> = ({
  projectName,
  record,
  existingRecords,
  isSaving,
  error,
  onClose,
  onSubmit,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [values, setValues] = useState<ProgressFormValues>({
    progressMonth: record?.progressMonth?.slice(0, 7) || new Date().toISOString().slice(0, 7),
    plannedProgress: record?.plannedProgress ?? 0,
    actualProgress: record?.actualProgress ?? 0,
    remarks: record?.remarks ?? '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const duplicate = existingRecords.some((item) =>
      item.progressMonth.slice(0, 7) === values.progressMonth && String(item.id ?? '') !== String(record?.id ?? '')
    );
    if (duplicate) {
      setLocalError('A progress entry already exists for this project and month.');
      return;
    }
    if (values.plannedProgress < 0 || values.plannedProgress > 100 || values.actualProgress < 0 || values.actualProgress > 100) {
      setLocalError('Progress values must be between 0 and 100.');
      return;
    }
    setLocalError(null);
    const saved = await onSubmit(values, record);
    if (saved) onClose();
  };

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full max-w-xl rounded-3xl border p-6 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
              {record ? 'Edit Monthly Progress' : 'Add Monthly Progress'}
            </h3>
            <p className={`mt-1 text-[11px] font-bold ${themeClasses.textSecondary}`}>{projectName}</p>
          </div>
          <button type="button" onClick={onClose} className={`rounded-xl px-3 py-2 text-sm font-bold ${themeClasses.buttonSecondary}`}>
            Close
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Progress Month</label>
              <input
                type="month"
                value={values.progressMonth}
                onChange={(e) => setValues((prev) => ({ ...prev, progressMonth: e.target.value }))}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.placeholder}`}
                required
              />
            </div>
            <div>
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Planned %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={values.plannedProgress}
                onChange={(e) => setValues((prev) => ({ ...prev, plannedProgress: Number(e.target.value) }))}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.placeholder}`}
                required
              />
            </div>
            <div>
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Actual %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={values.actualProgress}
                onChange={(e) => setValues((prev) => ({ ...prev, actualProgress: Number(e.target.value) }))}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.placeholder}`}
                required
              />
            </div>
          </div>

          <div>
            <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Remarks</label>
            <textarea
              value={values.remarks}
              onChange={(e) => setValues((prev) => ({ ...prev, remarks: e.target.value }))}
              className={`min-h-[96px] w-full resize-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.placeholder}`}
              placeholder="Optional progress notes"
            />
          </div>

          <p className={`text-[10px] font-bold ${themeClasses.textMuted}`}>Variance and performance percentage are calculated by the backend.</p>
          {(localError || error) && <p className="text-sm font-bold text-rose-500">{localError || error}</p>}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="button" onClick={onClose} className={`flex-1 rounded-2xl px-4 py-3 font-bold ${themeClasses.buttonSecondary}`}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-60">
              {isSaving ? 'Saving...' : 'Save Progress'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

const ConstructionProgressCard: React.FC<ConstructionProgressCardProps> = ({
  projectName = '',
  records,
  isLoading,
  error,
  isSaving = false,
  formError,
  onSave,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [editingRecord, setEditingRecord] = useState<ConstructionProgressRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sortedRecords = useMemo(() => sortByMonth(records), [records]);
  const availableYears = useMemo(
    () => Array.from(new Set(sortedRecords.map((record) => record.progressMonth.slice(0, 4)).filter(Boolean))).sort(),
    [sortedRecords]
  );
  const filteredRecords = useMemo(() => sortedRecords.filter((record) => {
    const month = record.progressMonth.slice(0, 7);
    const year = record.progressMonth.slice(0, 4);
    return (!monthFilter || month === monthFilter) && (!yearFilter || year === yearFilter);
  }), [monthFilter, sortedRecords, yearFilter]);
  const currentRecord = filteredRecords[filteredRecords.length - 1] || sortedRecords[sortedRecords.length - 1] || null;

  const totals = useMemo(() => {
    const planned = currentRecord?.plannedProgress ?? 0;
    const actual = currentRecord?.actualProgress ?? 0;
    const averagePerformance = filteredRecords.length
      ? filteredRecords.reduce((sum, record) => sum + record.performancePercentage, 0) / filteredRecords.length
      : 0;
    const latestVariance = currentRecord?.variance ?? 0;
    return { planned, actual, averagePerformance, latestVariance };
  }, [currentRecord, filteredRecords]);

  const trendData = filteredRecords.map((record) => ({
    month: monthLabel(record.progressMonth),
    planned: record.plannedProgress,
    actual: record.actualProgress,
    performance: record.performancePercentage,
  }));

  const openCreate = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  return (
    <div className={`p-3 rounded-xl border ${themeClasses.glassCard} ${themeClasses.border} shadow-sm`}>
      <div className={`mb-3 flex items-center justify-between gap-2 border-b pb-2 ${themeClasses.border}`}>
        <h3 className={`min-w-0 flex-1 truncate text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>CONSTRUCTION PROGRESS</h3>
        <CardHeaderActions reserveExpandSpace="expand">
          <FormulaInfoButton {...DASHBOARD_FORMULAS.constructionProgress} />
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-[9px] font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={!projectName}
          >
            <Icons.Add size={12} />
            Add
          </button>
        </CardHeaderActions>
      </div>

      <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className={`rounded-xl border px-3 py-2 ${themeClasses.border} ${themeClasses.bgSecondary}`}>
          <p className={`text-[8px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>Project</p>
          <p className={`truncate text-[11px] font-black ${themeClasses.textPrimary}`}>{projectName || 'No project selected'}</p>
        </div>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className={`rounded-xl px-3 py-2 text-[11px] font-bold outline-none ${themeClasses.input}`}
          aria-label="Filter construction progress by month"
        />
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className={`rounded-xl px-3 py-2 text-[11px] font-bold outline-none ${themeClasses.input}`}
          aria-label="Filter construction progress by year"
        >
          <option value="">All years</option>
          {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-14 animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />)}
          </div>
          <div className={`h-[260px] animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
        </div>
      ) : error ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-xl px-3 text-center text-sm font-bold text-rose-500">{error}</div>
      ) : sortedRecords.length === 0 ? (
        <div className={`flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center ${themeClasses.border}`}>
          <p className={`text-sm font-black uppercase tracking-widest ${themeClasses.textMuted}`}>No construction progress records</p>
          <p className={`mt-1 text-[11px] font-bold ${themeClasses.textSecondary}`}>Add the first monthly progress entry for this project.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {[
              ['Current Month Planned', totals.planned, 'text-indigo-500'],
              ['Current Month Actual', totals.actual, 'text-orange-400'],
              ['Average Performance', totals.averagePerformance, 'text-emerald-500'],
              ['Delay / Variance', totals.latestVariance, totals.latestVariance >= 0 ? 'text-emerald-500' : 'text-rose-500'],
            ].map(([label, value, color]) => (
              <div key={label as string} className={`rounded-xl border px-3 py-2 ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                <p className={`text-[8px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>{label}</p>
                <p className={`mt-1 text-lg font-black ${color}`}>{pct(value as number)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[180px_1fr] gap-3">
            <div className={`rounded-xl border p-3 ${themeClasses.border} ${themeClasses.bgSecondary}`}>
              <ProgressDonutChart planned={currentRecord?.plannedProgress ?? 0} actual={currentRecord?.actualProgress ?? 0} />
              <div className="mt-1 space-y-1 text-[10px] font-black">
                <div className="flex justify-between"><span className={themeClasses.textSecondary}>Construction</span><span className={themeClasses.textPrimary}>{monthLabel(currentRecord?.progressMonth ?? '')}</span></div>
                <div className="flex justify-between"><span className="text-indigo-500">Planned</span><span>{pct(currentRecord?.plannedProgress ?? 0)}</span></div>
                <div className="flex justify-between"><span className="text-orange-400">Actual</span><span>{pct(currentRecord?.actualProgress ?? 0)}</span></div>
                <div className="flex justify-between"><span className={currentRecord && currentRecord.variance >= 0 ? 'text-emerald-500' : 'text-rose-500'}>Variance</span><span>{pct(currentRecord?.variance ?? 0)}</span></div>
              </div>
            </div>

            <div className={`rounded-xl border p-3 ${themeClasses.border} ${themeClasses.bgSecondary}`}>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={trendData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
                  <XAxis dataKey="month" tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 9 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '0.5rem', color: isDarkTheme ? '#fff' : '#000' }} />
                  <Area type="monotone" dataKey="planned" name="Planned %" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.18} strokeWidth={2} />
                  <Area type="monotone" dataKey="actual" name="Actual %" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.18} strokeWidth={2} />
                  <Area type="monotone" dataKey="performance" name="Performance %" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {isModalOpen && (
        <ProgressFormModal
          projectName={projectName}
          record={editingRecord}
          existingRecords={sortedRecords}
          isSaving={isSaving}
          error={formError}
          onClose={() => setIsModalOpen(false)}
          onSubmit={onSave}
        />
      )}
    </div>
  );
};

export default React.memo(ConstructionProgressCard);
