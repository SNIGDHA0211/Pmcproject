import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProjectEquipmentRecord } from '../types';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { Icons } from './Icons';
import { CardHeaderActions, FormulaInfoButton } from './FormulaInfoButton';
import { ModalPortal } from './ModalPortal';
import { DASHBOARD_FORMULAS } from '../utils/dashboardFormulas';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import { getThemeClasses, useTheme } from '../utils/theme';

export type EquipmentFormValues = {
  equipmentMonth: string;
  plannedEquipment: number;
  actualEquipment: number;
  remarks: string;
};

type EquipmentCardProps = {
  projectName?: string;
  records: ProjectEquipmentRecord[];
  isLoading: boolean;
  error?: string | null;
  formError?: string | null;
  isSaving?: boolean;
  onRefresh: () => void;
  onSave: (values: EquipmentFormValues, record?: ProjectEquipmentRecord | null) => Promise<boolean> | boolean;
  onDelete: (record: ProjectEquipmentRecord) => Promise<boolean> | boolean;
};

const fmtPct = (value: number) => `${Number.isFinite(value) ? value.toFixed(2) : '0.00'}%`;
const monthLabel = (value: string) => value || '-';
const sortByMonth = (records: ProjectEquipmentRecord[]) => [...records].sort((a, b) => a.equipmentMonth.localeCompare(b.equipmentMonth));

const statusClasses = (status: string) => {
  switch (status) {
    case 'fully_deployed':
      return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    case 'near_target':
      return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    case 'shortfall':
      return 'bg-orange-500/15 text-orange-500 border-orange-500/30';
    case 'critical_shortfall':
      return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
    default:
      return 'bg-slate-500/15 text-slate-500 border-slate-500/30';
  }
};

const readableStatus = (status: string) => status ? status.replace(/_/g, ' ') : '-';

export const EquipmentKpiCards: React.FC<{ records: ProjectEquipmentRecord[] }> = ({ records }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const summary = useMemo(() => {
    const planned = records.reduce((sum, item) => sum + item.plannedEquipment, 0);
    const actual = records.reduce((sum, item) => sum + item.actualEquipment, 0);
    const variance = records.reduce((sum, item) => sum + item.variance, 0);
    const performance = records.length ? records.reduce((sum, item) => sum + item.performancePercentage, 0) / records.length : 0;
    return { planned, actual, variance, performance };
  }, [records]);

  const cards = [
    ['Total Planned', summary.planned, themeClasses.textPrimary],
    ['Total Actual', summary.actual, isDarkTheme ? 'text-slate-200' : 'text-[#1e3a5f]'],
    [
      'Total Variance',
      summary.variance,
      summary.variance > 0
        ? isDarkTheme
          ? 'text-slate-200'
          : 'text-slate-800'
        : summary.variance < 0
          ? 'text-rose-600/90'
          : themeClasses.textPrimary,
    ],
    ['Avg Performance', fmtPct(summary.performance), isDarkTheme ? 'text-slate-200' : 'text-[#1e3a5f]'],
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 xl:grid-cols-4">
      {cards.map(([label, value, color]) => (
        <div
          key={label as string}
          className={`flex min-h-[4.25rem] min-w-0 flex-col overflow-hidden rounded-lg border px-3 py-2 ${themeClasses.border} ${isDarkTheme ? 'bg-white/[0.03]' : 'bg-slate-50/80'}`}
        >
          <p
            className={`min-w-0 line-clamp-2 break-words text-[10px] font-semibold uppercase leading-snug tracking-wide ${themeClasses.textMuted}`}
          >
            {label}
          </p>
          <p className={`mt-auto min-w-0 truncate pt-1.5 text-lg font-bold tabular-nums sm:text-xl ${color}`}>
            {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          </p>
        </div>
      ))}
    </div>
  );
};

export const EquipmentBarChart: React.FC<{ records: ProjectEquipmentRecord[] }> = ({ records }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const tickFill = isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
  const tickSize = 11;
  const data = records.map((item) => ({
    month: item.equipmentMonth,
    planned: item.plannedEquipment,
    actual: item.actualEquipment,
    variance: item.variance,
    performance: item.performancePercentage,
  }));

  return (
    <div className={`min-h-[160px] flex-1 rounded-xl border sm:min-h-[190px] ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-gray-50/60'} px-2 py-2.5`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap={20} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
          <XAxis dataKey="month" tick={{ fill: tickFill, fontSize: tickSize }} />
          <YAxis width={36} tick={{ fill: tickFill, fontSize: tickSize }} />
          <Tooltip
            formatter={(value, name, props) => {
              if (name === 'planned') return [value, 'Planned'];
              if (name === 'actual') return [value, 'Actual'];
              return [value, name];
            }}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload;
              return item ? `${label} | Variance: ${item.variance} | Performance: ${fmtPct(item.performance)}` : String(label);
            }}
            contentStyle={{ background: isDarkTheme ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)', border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '6px', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} verticalAlign="bottom" height={24} />
          <Bar dataKey="planned" fill="#1e3a5f" radius={[3, 3, 0, 0]} name="Planned" />
          <Bar dataKey="actual" fill="#64748b" radius={[3, 3, 0, 0]} name="Actual" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


export const EquipmentFormModal: React.FC<{
  projectName: string;
  record?: ProjectEquipmentRecord | null;
  existingRecords: ProjectEquipmentRecord[];
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: EquipmentFormValues, record?: ProjectEquipmentRecord | null) => Promise<boolean> | boolean;
}> = ({ projectName, record, existingRecords, isSaving, error, onClose, onSubmit }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [values, setValues] = useState<EquipmentFormValues>({
    equipmentMonth: record?.equipmentMonth?.slice(0, 7) || new Date().toISOString().slice(0, 7),
    plannedEquipment: record?.plannedEquipment ?? 0,
    actualEquipment: record?.actualEquipment ?? 0,
    remarks: record?.remarks ?? '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const duplicate = existingRecords.some((item) =>
      item.equipmentMonth.slice(0, 7) === values.equipmentMonth && String(item.id ?? '') !== String(record?.id ?? '')
    );
    if (duplicate) {
      setLocalError('A project equipment entry already exists for this project and month.');
      return;
    }
    if (values.plannedEquipment < 0 || values.actualEquipment < 0) {
      setLocalError('Equipment values must be zero or greater.');
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
            <h3 className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>{record ? 'Edit Equipment' : 'Add Equipment'}</h3>
            <p className={`mt-1 text-[11px] font-bold ${themeClasses.textSecondary}`}>{projectName}</p>
          </div>
          <button type="button" onClick={onClose} className={`rounded-xl px-3 py-2 text-sm font-bold ${themeClasses.buttonSecondary}`}>Close</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Month</label>
              <input type="month" value={values.equipmentMonth} onChange={(e) => setValues((prev) => ({ ...prev, equipmentMonth: e.target.value }))} className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`} required />
            </div>
            <div>
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Planned</label>
              <input type="number" min="0" step="1" value={values.plannedEquipment} onChange={(e) => setValues((prev) => ({ ...prev, plannedEquipment: Number(e.target.value) }))} className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`} required />
            </div>
            <div>
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Actual</label>
              <input type="number" min="0" step="1" value={values.actualEquipment} onChange={(e) => setValues((prev) => ({ ...prev, actualEquipment: Number(e.target.value) }))} className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`} required />
            </div>
          </div>
          <div>
            <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Remarks</label>
            <textarea value={values.remarks} onChange={(e) => setValues((prev) => ({ ...prev, remarks: e.target.value }))} className={`min-h-[96px] w-full resize-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`} />
          </div>
          <p className={`text-[10px] font-bold ${themeClasses.textMuted}`}>Variance, performance percentage, and equipment status are calculated by the backend.</p>
          {(localError || error) && <p className="text-sm font-bold text-rose-500">{localError || error}</p>}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="button" onClick={onClose} className={`flex-1 rounded-2xl px-4 py-3 font-bold ${themeClasses.buttonSecondary}`}>Cancel</button>
            <button type="submit" disabled={isSaving} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-60">{isSaving ? 'Saving...' : 'Save Equipment'}</button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

const ProjectEquipmentCard: React.FC<EquipmentCardProps> = ({
  projectName = '',
  records,
  isLoading,
  error,
  formError,
  isSaving = false,
  onRefresh,
  onSave,
  onDelete,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [editingRecord, setEditingRecord] = useState<ProjectEquipmentRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ProjectEquipmentRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sortedRecords = useMemo(() => sortByMonth(records), [records]);
  const availableYears = useMemo(() => Array.from(new Set(sortedRecords.map((item) => item.equipmentMonth.slice(0, 4)).filter(Boolean))).sort(), [sortedRecords]);
  const filteredRecords = useMemo(() => sortedRecords.filter((item) => {
    const month = item.equipmentMonth.slice(0, 7);
    const year = item.equipmentMonth.slice(0, 4);
    return (!monthFilter || month === monthFilter) && (!yearFilter || year === yearFilter);
  }), [monthFilter, sortedRecords, yearFilter]);

  return (
    <div className={`project-equipment-card joyride-target-stable relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border p-3 transition-shadow hover:shadow-md sm:p-3.5 ${themeClasses.glassCard} ${themeClasses.border} shadow-sm`}>
      <DashboardCardTopAccent variant="executive" />
      <div className={`mb-2.5 flex flex-col gap-2 border-b pb-3 pt-0.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between ${themeClasses.border}`}>
        <div className="min-w-0 flex-1">
          <h3 className={typo.sectionTitle(isDarkTheme)}>PROJECT EQUIPMENT</h3>
          <p className={`mt-1 line-clamp-2 text-xs font-medium uppercase leading-snug ${themeClasses.textMuted}`}>
            {projectName || 'No project selected'}
          </p>
        </div>
        <CardHeaderActions className="w-full shrink-0 justify-end sm:w-auto">
          <FormulaInfoButton {...DASHBOARD_FORMULAS.projectEquipment} />
          <button type="button" onClick={onRefresh} className={`h-9 shrink-0 rounded-lg px-3 sm:h-8 ${typo.buttonSm} ${themeClasses.buttonSecondary}`}>
            Refresh
          </button>
          <button
            type="button"
            onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}
            disabled={!projectName}
            className={`h-9 shrink-0 rounded-lg bg-[#1e3a5f] px-3 sm:h-8 ${typo.buttonSm} text-white hover:bg-[#274868] disabled:opacity-60`}
          >
            Add
          </button>
        </CardHeaderActions>
      </div>

      <div className="mb-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className={`rounded-xl px-3 py-2 ${typo.body} outline-none ${themeClasses.input}`} aria-label="Filter project equipment by month" />
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className={`rounded-xl px-3 py-2 ${typo.body} outline-none ${themeClasses.input}`} aria-label="Filter project equipment by year">
          <option value="">All years</option>
          {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-14 animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />)}</div>
          <div className={`h-[190px] animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
        </div>
      ) : error ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-xl px-3 text-center text-sm font-bold text-rose-500">{error}</div>
      ) : sortedRecords.length === 0 ? (
        <div className={`flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center ${themeClasses.border}`}>
          <p className={`${typo.empty} ${themeClasses.textMuted}`}>No equipment records</p>
          <p className={`mt-1 ${typo.helper} ${themeClasses.textSecondary}`}>Add the first monthly equipment entry for this project.</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-1">
          <EquipmentKpiCards records={filteredRecords} />
          <EquipmentBarChart records={filteredRecords} />
        </div>
      )}

      {isModalOpen && (
        <EquipmentFormModal
          projectName={projectName}
          record={editingRecord}
          existingRecords={sortedRecords}
          isSaving={isSaving}
          error={formError}
          onClose={() => setIsModalOpen(false)}
          onSubmit={onSave}
        />
      )}

      {deleteRecord && (
        <ModalPortal open>
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}>
            <h3 className={`text-lg font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>Delete Equipment Record</h3>
            <p className={`mt-2 text-sm font-bold ${themeClasses.textSecondary}`}>Delete the equipment record for {deleteRecord.equipmentMonth}? This cannot be undone.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setDeleteRecord(null)} className={`flex-1 rounded-2xl px-4 py-3 font-bold ${themeClasses.buttonSecondary}`}>Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  const deleted = await onDelete(deleteRecord);
                  if (deleted) setDeleteRecord(null);
                }}
                className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 font-bold text-white hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default React.memo(ProjectEquipmentCard);
