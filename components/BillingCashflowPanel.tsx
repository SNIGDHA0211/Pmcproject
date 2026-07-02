import React, { useCallback, useMemo, useState } from 'react';
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
import { IndianRupee, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { cashflowApi, getApiErrorMessage, toNum, unwrapList } from '../services/api';
import type { CashFlowRecord } from '../types/billing';
import { emptyCashflowRecord } from '../types/billing';
import { buildCashflowChartData, summarizeCashflow } from '../utils/billingDashboardAnalytics';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';
import { getThemeClasses, useTheme } from '../utils/theme';

function normalizeCashflowRecord(row: unknown): CashFlowRecord {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string | number | undefined,
    project_name: String(r.project_name ?? r.projectName ?? ''),
    month_year: String(r.month_year ?? r.monthYear ?? ''),
    cash_in_monthly_plan: toNum(r.cash_in_monthly_plan),
    cash_in_monthly_actual: toNum(r.cash_in_monthly_actual),
    cash_out_monthly_plan: toNum(r.cash_out_monthly_plan),
    cash_out_monthly_actual: toNum(r.cash_out_monthly_actual),
    actual_cost_monthly: toNum(r.actual_cost_monthly),
  };
}

interface BillingCashflowPanelProps {
  projectName: string;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

const BillingCashflowPanel: React.FC<BillingCashflowPanelProps> = ({ projectName, onToast }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [records, setRecords] = useState<CashFlowRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CashFlowRecord | null>(null);
  const [form, setForm] = useState<CashFlowRecord>(() => emptyCashflowRecord(projectName));
  const [formError, setFormError] = useState<string | null>(null);

  const cardCls = `rounded-2xl border p-4 sm:p-5 ${
    isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm'
  }`;

  const loadCashflow = useCallback(async () => {
    if (!projectName) return;
    setLoading(true);
    try {
      const res = await cashflowApi.getCashflow({ project_name: projectName });
      const list = unwrapList<unknown>(res.data).map(normalizeCashflowRecord);
      setRecords(list);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  React.useEffect(() => {
    void loadCashflow();
  }, [loadCashflow]);

  const summary = useMemo(() => summarizeCashflow(records), [records]);
  const chartData = useMemo(() => buildCashflowChartData(records), [records]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCashflowRecord(projectName));
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: CashFlowRecord) => {
    setEditing(row);
    setForm({ ...row });
    setFormError(null);
    setModalOpen(true);
  };

  const handleDelete = async (row: CashFlowRecord) => {
    if (!row.id) return;
    if (!window.confirm(`Delete cashflow record for ${row.month_year}?`)) return;
    try {
      await cashflowApi.deleteCashflow(row.id);
      onToast('Cashflow record deleted.');
      await loadCashflow();
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Failed to delete cashflow record.'), 'error');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.month_year.trim()) {
      setFormError('Month is required (e.g. Jan-2026).');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, project_name: projectName };
      if (editing?.id) {
        await cashflowApi.updateCashflow(editing.id, payload);
        onToast('Cashflow record updated.');
      } else {
        await cashflowApi.createCashflow(payload);
        onToast('Cashflow record added.');
      }
      setModalOpen(false);
      await loadCashflow();
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Failed to save cashflow record.'));
    } finally {
      setSaving(false);
    }
  };

  const tooltipStyle = {
    backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
    border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
    borderRadius: 12,
    fontSize: 12,
  };

  const formatInr = (n: number) =>
    `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className={cardCls}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDarkTheme ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
            <IndianRupee size={20} />
          </span>
          <div>
            <h3 className={`text-xs font-black uppercase tracking-widest sm:text-sm ${themeClasses.textPrimary}`}>
              Cash Flow Management
            </h3>
            <p className={`text-[11px] font-semibold ${themeClasses.textSecondary}`}>{projectName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-indigo-500"
        >
          <Plus size={14} />
          Add Cash Flow
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Cash In (Actual)', value: formatInr(summary.cashInActual), icon: TrendingUp, tone: 'text-emerald-500' },
          { label: 'Cash Out (Actual)', value: formatInr(summary.cashOutActual), icon: TrendingDown, tone: 'text-rose-500' },
          { label: 'Net Cash Flow', value: formatInr(summary.netActual), icon: IndianRupee, tone: summary.netActual >= 0 ? 'text-emerald-500' : 'text-rose-500' },
          { label: 'Records', value: String(summary.recordCount), icon: IndianRupee, tone: themeClasses.textPrimary },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
            <p className={`text-[9px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>{label}</p>
            <p className={`mt-1 flex items-center gap-1 text-sm font-black tabular-nums sm:text-base ${tone}`}>
              <Icon size={14} className="shrink-0 opacity-70" />
              {value}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : chartData.length > 0 ? (
        <div className="mb-4 h-[220px] sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatInr(v), '']} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cashIn" name="Cash In" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="cashOut" name="Cash Out" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className={`mb-4 rounded-xl border border-dashed py-10 text-center text-sm ${isDarkTheme ? 'border-white/15 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
          No cashflow data yet. Add your first monthly record.
        </p>
      )}

      {records.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className={isDarkTheme ? 'bg-white/[0.04]' : 'bg-slate-50'}>
              <tr>
                {['Month', 'In Plan', 'In Actual', 'Out Plan', 'Out Actual', 'Cost', 'Actions'].map((h) => (
                  <th key={h} className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-wider ${themeClasses.textSecondary}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${themeClasses.border}`}>
              {records.map((row) => (
                <tr key={String(row.id ?? row.month_year)} className={themeClasses.bgHover}>
                  <td className={`px-3 py-2.5 font-semibold ${themeClasses.textPrimary}`}>{row.month_year}</td>
                  <td className="px-3 py-2.5 tabular-nums text-emerald-600">{formatInr(row.cash_in_monthly_plan)}</td>
                  <td className="px-3 py-2.5 tabular-nums font-bold text-emerald-600">{formatInr(row.cash_in_monthly_actual)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-rose-500">{formatInr(row.cash_out_monthly_plan)}</td>
                  <td className="px-3 py-2.5 tabular-nums font-bold text-rose-500">{formatInr(row.cash_out_monthly_actual)}</td>
                  <td className={`px-3 py-2.5 tabular-nums ${themeClasses.textPrimary}`}>{formatInr(row.actual_cost_monthly)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => openEdit(row)} className={`rounded-lg p-1.5 ${themeClasses.buttonSecondary}`} aria-label="Edit">
                        <Icons.Edit size={14} />
                      </button>
                      {row.id && (
                        <button type="button" onClick={() => void handleDelete(row)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10" aria-label="Delete">
                          <Icons.Reject size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[100040] flex items-center justify-center bg-black/50 p-4">
            <div className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-5 shadow-2xl ${themeClasses.glassCard} ${themeClasses.border}`}>
              <h4 className={`mb-4 text-base font-black uppercase ${themeClasses.textPrimary}`}>
                {editing ? 'Edit Cash Flow' : 'Add Cash Flow'}
              </h4>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>Month (e.g. Jan-2026)</label>
                  <input
                    value={form.month_year}
                    onChange={(e) => setForm((p) => ({ ...p, month_year: e.target.value }))}
                    required
                    className={`w-full rounded-xl border px-3 py-2 text-sm ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
                  />
                </div>
                {([
                  ['cash_in_monthly_plan', 'Cash In Plan'],
                  ['cash_in_monthly_actual', 'Cash In Actual'],
                  ['cash_out_monthly_plan', 'Cash Out Plan'],
                  ['cash_out_monthly_actual', 'Cash Out Actual'],
                  ['actual_cost_monthly', 'Actual Cost'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>{label}</label>
                    <input
                      type="number"
                      min={0}
                      value={form[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: Number(e.target.value) || 0 }))}
                      className={`w-full rounded-xl border px-3 py-2 text-sm ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
                    />
                  </div>
                ))}
                {formError && <p className="text-xs font-semibold text-rose-500">{formError}</p>}
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className={`rounded-xl border px-4 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}>Cancel</button>
                  <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default BillingCashflowPanel;
