import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CorrespondenceRecord } from '../types';
import { Icons } from './Icons';
import { CardHeaderActions, CardEditButton, FormulaInfoButton } from './FormulaInfoButton';
import { ModalPortal } from './ModalPortal';
import { DASHBOARD_FORMULAS } from '../utils/dashboardFormulas';
import { getThemeClasses, useTheme } from '../utils/theme';

export type CorrespondenceFormValues = {
  correspondenceReceived: number;
  correspondenceDelivered: number;
};

type CorrespondenceStatusCardProps = {
  projectName?: string;
  records: CorrespondenceRecord[];
  isLoading: boolean;
  error?: string | null;
  formError?: string | null;
  isSaving?: boolean;
  onRefresh: () => void;
  onSave: (values: CorrespondenceFormValues, record?: CorrespondenceRecord | null) => Promise<boolean> | boolean;
  onDelete: (record: CorrespondenceRecord) => Promise<boolean> | boolean;
};

const fmtPct = (value: number) => `${Number.isFinite(value) ? value.toFixed(2) : '0.00'}%`;

const deliveryClass = (value: number) => {
  if (value >= 100) return 'text-emerald-500';
  if (value >= 80) return 'text-amber-500';
  if (value < 60) return 'text-rose-500';
  return 'text-orange-500';
};

const statusBadge = (value: number) => {
  if (value >= 100) return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
  if (value >= 80) return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
  return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
};

const latestRecord = (records: CorrespondenceRecord[]) => records[0] ?? null;

export const CorrespondenceKpiCards: React.FC<{ record: CorrespondenceRecord | null }> = ({ record }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const cards: Array<{
    label: string;
    value: string | number;
    color: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    { label: 'Received', value: record?.correspondenceReceived ?? 0, color: 'text-indigo-500', Icon: Icons.Document },
    { label: 'Delivered', value: record?.correspondenceDelivered ?? 0, color: 'text-emerald-500', Icon: Icons.Check },
    { label: 'Pending', value: record?.pendingCorrespondence ?? 0, color: 'text-orange-400', Icon: Icons.Clock },
    { label: 'Delivery %', value: fmtPct(record?.deliveryPercentage ?? 0), color: deliveryClass(record?.deliveryPercentage ?? 0), Icon: Icons.Performance },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
      {cards.map(({ label, value, color, Icon: MetricIcon }) => {
        return (
          <div key={label} className={`rounded-xl border px-3 py-2 ${themeClasses.border} ${themeClasses.bgSecondary}`}>
            <div className="flex items-center gap-2">
              <MetricIcon size={13} className={isDarkTheme ? 'text-blue-300' : 'text-blue-600'} />
              <p className={`text-[8px] font-medium uppercase tracking-widest ${themeClasses.textMuted}`}>{label}</p>
            </div>
            <p className={`mt-1 text-base font-semibold tabular-nums ${color}`}>{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
          </div>
        );
      })}
    </div>
  );
};

export const CorrespondenceBarChart: React.FC<{ record: CorrespondenceRecord | null }> = ({ record }) => {
  const { isDarkTheme } = useTheme();
  const data = record ? [{
    category: 'Correspondence',
    total: record.correspondenceReceived,
    shortLead: record.correspondenceDelivered,
    longLead: record.pendingCorrespondence,
    deliveryPercentage: record.deliveryPercentage,
  }] : [];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
        <XAxis dataKey="category" tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 8 }} />
        <YAxis tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 8 }} />
        <Tooltip
          formatter={(value, name, props) => {
            const labels: Record<string, string> = { total: 'Received', shortLead: 'Delivered', longLead: 'Pending' };
            return [value, labels[String(name)] || String(name)];
          }}
          labelFormatter={(_, payload) => {
            const item = payload?.[0]?.payload;
            return item ? `Delivery: ${fmtPct(item.deliveryPercentage)}` : 'Correspondence';
          }}
          contentStyle={{ background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '0.5rem', color: isDarkTheme ? '#fff' : '#000' }}
        />
        <Legend wrapperStyle={{ fontSize: '9px' }} />
        <Bar dataKey="total" fill="#4f46e5" name="Total" />
        <Bar dataKey="shortLead" fill="#10b981" name="Delivered" />
        <Bar dataKey="longLead" fill="#f59e0b" name="Pending" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const CorrespondenceTrendChart: React.FC<{ records: CorrespondenceRecord[] }> = ({ records }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const data = records.map((record, index) => ({
    name: record.updatedAt ? new Date(record.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : `R${index + 1}`,
    pending: record.pendingCorrespondence,
    delivery: record.deliveryPercentage,
  }));

  return (
    <div className={`h-[110px] rounded-xl border px-1.5 py-2 ${themeClasses.border} ${themeClasses.bgSecondary}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
          <XAxis dataKey="name" tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 8 }} />
          <YAxis tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 8 }} />
          <Tooltip contentStyle={{ background: isDarkTheme ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)', borderRadius: '6px', fontSize: '10px' }} />
          <Area type="monotone" dataKey="delivery" name="Delivery %" stroke="#10b981" fill="#10b981" fillOpacity={0.12} strokeWidth={2} />
          <Area type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CorrespondenceTable: React.FC<{
  records: CorrespondenceRecord[];
  onEdit: (record: CorrespondenceRecord) => void;
  onDelete: (record: CorrespondenceRecord) => void;
}> = ({ records, onEdit, onDelete }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div className={`max-h-[150px] overflow-auto rounded-xl border ${themeClasses.border}`}>
      <table className="w-full min-w-[680px] text-[8px] border-collapse">
        <thead>
          <tr className={isDarkTheme ? 'bg-blue-900/30' : 'bg-blue-50/70'}>
            {['Project', 'Received', 'Delivered', 'Pending', 'Delivery %', 'Last Updated', 'Actions'].map((heading) => (
              <th key={heading} className={`px-2 py-1.5 text-left font-semibold uppercase ${themeClasses.textPrimary}`}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id ?? record.projectName} className={`border-t ${themeClasses.border}`}>
              <td className={`px-2 py-1.5 font-medium ${themeClasses.textPrimary}`}>{record.projectName}</td>
              <td className={`px-2 py-1.5 font-medium tabular-nums ${themeClasses.textPrimary}`}>{record.correspondenceReceived}</td>
              <td className="px-2 py-1.5 font-medium tabular-nums text-emerald-500">{record.correspondenceDelivered}</td>
              <td className="px-2 py-1.5 font-medium tabular-nums text-orange-400">{record.pendingCorrespondence}</td>
              <td className={`px-2 py-1.5 font-semibold tabular-nums ${deliveryClass(record.deliveryPercentage)}`}>
                <span className={`rounded-full border px-2 py-0.5 ${statusBadge(record.deliveryPercentage)}`}>{fmtPct(record.deliveryPercentage)}</span>
              </td>
              <td className={`px-2 py-1.5 font-medium ${themeClasses.textSecondary}`}>{record.updatedAt ? new Date(record.updatedAt).toLocaleString('en-IN') : '-'}</td>
              <td className="px-2 py-1">
                <CardEditButton onClick={() => onEdit(record)} title="Edit correspondence" />
                <button type="button" onClick={() => onDelete(record)} className="rounded-lg px-2 py-1 text-[9px] font-semibold text-rose-500 hover:bg-rose-500/10" title="Delete correspondence">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const CorrespondenceFormModal: React.FC<{
  projectName: string;
  record?: CorrespondenceRecord | null;
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: CorrespondenceFormValues, record?: CorrespondenceRecord | null) => Promise<boolean> | boolean;
}> = ({ projectName, record, isSaving, error, onClose, onSubmit }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [values, setValues] = useState<CorrespondenceFormValues>({
    correspondenceReceived: record?.correspondenceReceived ?? 0,
    correspondenceDelivered: record?.correspondenceDelivered ?? 0,
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (values.correspondenceReceived < 0 || values.correspondenceDelivered < 0) {
      setLocalError('Correspondence values cannot be negative.');
      return;
    }
    if (values.correspondenceDelivered > values.correspondenceReceived) {
      setLocalError('Delivered correspondence cannot exceed received correspondence.');
      return;
    }
    setLocalError(null);
    const saved = await onSubmit(values, record);
    if (saved) onClose();
  };

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>{record ? 'Edit Correspondence' : 'Add Correspondence'}</h3>
            <p className={`mt-1 text-[11px] font-bold ${themeClasses.textSecondary}`}>{projectName}</p>
          </div>
          <button type="button" onClick={onClose} className={`rounded-xl px-3 py-2 text-sm font-bold ${themeClasses.buttonSecondary}`}>Close</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Received</label>
              <input type="number" min="0" value={values.correspondenceReceived} onChange={(e) => setValues((prev) => ({ ...prev, correspondenceReceived: Number(e.target.value) }))} className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`} required />
            </div>
            <div>
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Delivered</label>
              <input type="number" min="0" value={values.correspondenceDelivered} onChange={(e) => setValues((prev) => ({ ...prev, correspondenceDelivered: Number(e.target.value) }))} className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`} required />
            </div>
          </div>
          <p className={`text-[10px] font-bold ${themeClasses.textMuted}`}>Pending correspondence and delivery percentage are calculated by the backend.</p>
          {(localError || error) && <p className="text-sm font-bold text-rose-500">{localError || error}</p>}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="button" onClick={onClose} className={`flex-1 rounded-2xl px-4 py-3 font-bold ${themeClasses.buttonSecondary}`}>Cancel</button>
            <button type="submit" disabled={isSaving} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-60">{isSaving ? 'Saving...' : 'Save Correspondence'}</button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

const CorrespondenceStatusCard: React.FC<CorrespondenceStatusCardProps> = ({
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
  const [editingRecord, setEditingRecord] = useState<CorrespondenceRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<CorrespondenceRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const sortedRecords = useMemo(() => [...records].sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''))), [records]);
  const currentRecord = latestRecord(sortedRecords);

  return (
    <div className={`p-3 rounded-xl border ${themeClasses.glassCard} ${themeClasses.border} shadow-sm`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className={`truncate text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Correspondence & Delivery Status</h3>
          <p className={`mt-0.5 text-[9px] font-medium uppercase tracking-widest ${themeClasses.textMuted}`}>{projectName || 'No project selected'}</p>
        </div>
        <CardHeaderActions reserveExpandSpace="expand">
          <FormulaInfoButton {...DASHBOARD_FORMULAS.correspondence} />
          <button type="button" onClick={onRefresh} className={`h-7 shrink-0 rounded-lg px-2 text-[8px] font-semibold uppercase tracking-widest ${themeClasses.buttonSecondary}`}>Refresh</button>
          <button type="button" onClick={() => { setEditingRecord(currentRecord); setIsModalOpen(true); }} disabled={!projectName} className="h-7 shrink-0 rounded-lg bg-blue-600 px-2 py-1 text-[8px] font-semibold uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60">
            {currentRecord ? 'Edit' : 'Add'}
          </button>
        </CardHeaderActions>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-14 animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />)}</div>
          <div className={`h-[180px] animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
        </div>
      ) : error ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl px-3 text-center text-sm font-bold text-rose-500">{error}</div>
      ) : !currentRecord ? (
        <div className={`flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center ${themeClasses.border}`}>
          <p className={`text-sm font-black uppercase tracking-widest ${themeClasses.textMuted}`}>No correspondence records</p>
          <p className={`mt-1 text-[11px] font-bold ${themeClasses.textSecondary}`}>Add correspondence received and delivered values for this project.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <CorrespondenceKpiCards record={currentRecord} />
          <CorrespondenceBarChart record={currentRecord} />
          {sortedRecords.length > 1 && <CorrespondenceTrendChart records={sortedRecords} />}
        </div>
      )}

      {isModalOpen && (
        <CorrespondenceFormModal
          projectName={projectName}
          record={editingRecord}
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
            <h3 className={`text-lg font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>Delete Correspondence</h3>
            <p className={`mt-2 text-sm font-bold ${themeClasses.textSecondary}`}>Delete this correspondence record? This cannot be undone.</p>
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

export default React.memo(CorrespondenceStatusCard);
