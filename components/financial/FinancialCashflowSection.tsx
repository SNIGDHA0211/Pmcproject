import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  cashflowApi,
  getApiErrorMessage,
  saveCashflowForPeriod,
  toNum,
  unwrapList,
} from '../../services/api';
import type { CashFlowRecord } from '../../types/billing';
import { emptyCashflowRecord } from '../../types/billing';
import { buildCashflowChartData, summarizeCashflow } from '../../utils/billingDashboardAnalytics';
import { costRecordMatchesPeriod, formatFinancialMonthYear } from '../../utils/financialPeriod';
import FinancialQuickUpdateCard, { FinancialFormGrid, financialFieldInput, financialFieldLabel } from './FinancialQuickUpdateCard';
import { getThemeClasses, useTheme } from '../../utils/theme';

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

const CASHFLOW_FIELDS = [
  { key: 'cash_in_monthly_plan' as const, label: 'Cash In (Plan)' },
  { key: 'cash_in_monthly_actual' as const, label: 'Cash In (Actual)' },
  { key: 'cash_out_monthly_plan' as const, label: 'Cash Out (Plan)' },
  { key: 'cash_out_monthly_actual' as const, label: 'Cash Out (Actual)' },
  { key: 'actual_cost_monthly' as const, label: 'Actual Cost (Monthly)' },
];

interface FinancialCashflowSectionProps {
  projectName: string;
  month: number;
  year: number;
  periodLabel: string;
  formSuccessBanner: string | null;
  onReset: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
  isDarkTheme: boolean;
  themeClasses: ReturnType<typeof getThemeClasses>;
}

const FinancialCashflowSection: React.FC<FinancialCashflowSectionProps> = ({
  projectName,
  month,
  year,
  periodLabel,
  formSuccessBanner,
  onReset,
  onRefresh,
  isRefreshing,
  onSaved,
  onError,
  isDarkTheme,
  themeClasses,
}) => {
  const [records, setRecords] = useState<CashFlowRecord[]>([]);
  const [form, setForm] = useState<CashFlowRecord>(() => emptyCashflowRecord(projectName));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const periodKey = formatFinancialMonthYear(month, year);
  const fieldLabel = financialFieldLabel(isDarkTheme, themeClasses);
  const fieldInput = financialFieldInput(isDarkTheme, themeClasses);

  const loadCashflow = useCallback(async () => {
    if (!projectName) return;
    setLoading(true);
    try {
      const res = await cashflowApi.getCashflow({ project_name: projectName });
      const list = unwrapList<unknown>(res.data).map(normalizeCashflowRecord);
      setRecords(list);
      const current =
        list.find((row) => costRecordMatchesPeriod(row.month_year, month, year)) ??
        emptyCashflowRecord(projectName);
      setForm({
        ...current,
        project_name: projectName,
        month_year: current.month_year || periodKey,
      });
      setFormError(null);
    } catch (error) {
      onError(getApiErrorMessage(error, 'Failed to load cashflow data.'));
      setRecords([]);
      setForm({ ...emptyCashflowRecord(projectName), month_year: periodKey });
    } finally {
      setLoading(false);
    }
  }, [projectName, month, year, periodKey, onError]);

  useEffect(() => {
    void loadCashflow();
  }, [loadCashflow]);

  const summary = useMemo(() => summarizeCashflow(records), [records]);
  const chartData = useMemo(() => buildCashflowChartData(records), [records]);

  const formatInr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const handleSave = async () => {
    if (!projectName) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload: CashFlowRecord = {
        ...form,
        project_name: projectName,
        month_year: form.month_year?.trim() || periodKey,
      };
      await saveCashflowForPeriod(
        { ...payload } as Record<string, unknown>,
        {
        projectName,
        month,
        year,
        existingId: form.id,
      },
      );
      onSaved(
        form.id != null
          ? 'Cashflow saved successfully.'
          : 'Cashflow record created successfully.',
      );
      await loadCashflow();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to save cashflow record.');
      setFormError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    onReset();
    void loadCashflow();
  };

  const tooltipStyle = {
    backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
    border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
    borderRadius: 12,
    fontSize: 12,
  };

  const metricTile = `rounded-xl border px-3 py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
    }`;

  const cardBase = isDarkTheme
    ? 'pmc-ov-card rounded-2xl pmc360-glass-panel-dark'
    : 'pmc-ov-card rounded-2xl pmc360-glass-panel-light';

  return (
    <div className="space-y-5 financial-cashflow-tab">
      <FinancialQuickUpdateCard
        title="Update Cashflow"
        projectName={projectName}
        periodLabel={periodLabel}
        successBanner={formSuccessBanner}
        className="financial-cashflow-form"
        onSave={() => void handleSave()}
        onReset={handleReset}
        onRefresh={() => {
          onRefresh();
          void loadCashflow();
        }}
        saving={saving}
        refreshDisabled={isRefreshing || loading}
        footerNote={!form.id ? 'No saved record for this period — enter values and save.' : undefined}
        isDarkTheme={isDarkTheme}
        themeClasses={themeClasses}
      >
        {formError && <p className="mb-5 text-xs font-bold text-rose-500">{formError}</p>}
        <FinancialFormGrid>
          <div className="financial-cashflow-month">
            <label className={fieldLabel} htmlFor="cashflow-month-year">
              Month / Year
            </label>
            <input
              id="cashflow-month-year"
              type="text"
              value={form.month_year}
              onChange={(e) => setForm((prev) => ({ ...prev, month_year: e.target.value }))}
              placeholder={periodKey}
              className={fieldInput}
            />
          </div>
          {CASHFLOW_FIELDS.map(({ key, label }) => (
            <div key={key} className={`financial-cashflow-${key.replace(/_/g, '-')}`}>
              <label className={fieldLabel} htmlFor={`cashflow-${key}`}>
                {label}
              </label>
              <input
                id={`cashflow-${key}`}
                type="number"
                min={0}
                value={form[key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))
                }
                className={fieldInput}
              />
            </div>
          ))}
        </FinancialFormGrid>
      </FinancialQuickUpdateCard>

      {/* ── STAT TILES ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Cash In (Actual)', value: formatInr(summary.cashInActual), accent: '#10b981', tone: 'text-emerald-500 dark:text-emerald-400' },
          { label: 'Cash Out (Actual)', value: formatInr(summary.cashOutActual), accent: '#f43f5e', tone: 'text-rose-500 dark:text-rose-400' },
          {
            label: 'Net Cash Flow',
            value: formatInr(summary.netActual),
            accent: summary.netActual >= 0 ? '#10b981' : '#f43f5e',
            tone: summary.netActual >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400',
          },
          { label: 'Total Records', value: String(summary.recordCount), accent: '#3b82f6', tone: themeClasses.textPrimary },
        ].map((item, i) => (
          <div
            key={item.label}
            className={`p-3.5 ${cardBase} pmc-ov-tile`}
            style={{
              '--ov-accent': item.accent,
              '--ov-delay': `${i * 60}ms`,
              borderLeftWidth: 4,
              borderLeftColor: item.accent,
            } as React.CSSProperties}
          >
            <p className={`text-[10px] font-black uppercase tracking-wider ${themeClasses.textMuted}`}>
              {item.label}
            </p>
            <p className={`mt-1 text-base font-black tabular-nums sm:text-lg ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : chartData.length > 0 ? (
        <div className={`p-4 sm:p-5 ${cardBase}`} style={{ '--ov-accent': '#10b981', '--ov-delay': '180ms' } as React.CSSProperties}>
          <div className="mb-4 flex items-center justify-between">
            <h4 className={`text-xs font-black uppercase tracking-wider ${themeClasses.textPrimary}`}>
              Cashflow Trend Analytics
            </h4>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">Monthly Cash In vs Out</span>
          </div>
          <div className="h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="cf-in" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="cf-out" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }}
                  tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatInr(v), '']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cashIn" name="Cash In" fill="url(#cf-in)" radius={[5, 5, 0, 0]} maxBarSize={28} animationDuration={900} />
                <Bar dataKey="cashOut" name="Cash Out" fill="url(#cf-out)" radius={[5, 5, 0, 0]} maxBarSize={28} animationDuration={900} animationBegin={150} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {records.length > 0 && (
        <div className={`overflow-x-auto ${cardBase}`} style={{ '--ov-accent': '#3b82f6' } as React.CSSProperties}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className={isDarkTheme ? 'bg-white/[0.04]' : 'bg-slate-50/80'}>
              <tr>
                {['Month', 'In Plan', 'In Actual', 'Out Plan', 'Out Actual', 'Cost'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider ${themeClasses.textMuted}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${themeClasses.border}`}>
              {records.map((row, i) => {
                const isCurrent = costRecordMatchesPeriod(row.month_year, month, year);
                return (
                  <tr
                    key={String(row.id ?? row.month_year)}
                    className={`pmc-ov-row transition-colors ${
                      isCurrent
                        ? isDarkTheme ? 'bg-blue-500/15' : 'bg-blue-50/80'
                        : themeClasses.bgHover
                    }`}
                    style={{ '--ov-row-delay': `${i * 50}ms` } as React.CSSProperties}
                  >
                    <td className={`px-4 py-3 font-bold ${themeClasses.textPrimary}`}>{row.month_year}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-600 dark:text-emerald-400">{formatInr(row.cash_in_monthly_plan)}</td>
                    <td className="px-4 py-3 tabular-nums font-black text-emerald-600 dark:text-emerald-400">
                      {formatInr(row.cash_in_monthly_actual)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-rose-500 dark:text-rose-400">{formatInr(row.cash_out_monthly_plan)}</td>
                    <td className="px-4 py-3 tabular-nums font-black text-rose-500 dark:text-rose-400">
                      {formatInr(row.cash_out_monthly_actual)}
                    </td>
                    <td className={`px-4 py-3 tabular-nums font-bold ${themeClasses.textPrimary}`}>
                      {formatInr(row.actual_cost_monthly)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FinancialCashflowSection;
