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
        {formError && <p className="mb-5 text-sm font-medium text-rose-500">{formError}</p>}
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Cash In (Actual)', value: formatInr(summary.cashInActual), tone: 'text-emerald-500' },
          { label: 'Cash Out (Actual)', value: formatInr(summary.cashOutActual), tone: 'text-rose-500' },
          {
            label: 'Net Cash Flow',
            value: formatInr(summary.netActual),
            tone: summary.netActual >= 0 ? 'text-emerald-500' : 'text-rose-500',
          },
          { label: 'Records', value: String(summary.recordCount), tone: themeClasses.textPrimary },
        ].map((item) => (
          <div key={item.label} className={metricTile}>
            <p className={`text-[9px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>
              {item.label}
            </p>
            <p className={`mt-1 text-sm font-black tabular-nums sm:text-base ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : chartData.length > 0 ? (
        <div className={`rounded-2xl border p-4 ${themeClasses.glassCard} ${themeClasses.border}`}>
          <h4 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Cashflow Trend
          </h4>
          <div className="h-[220px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }}
                  tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatInr(v), '']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cashIn" name="Cash In" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="cashOut" name="Cash Out" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {records.length > 0 && (
        <div className={`overflow-x-auto rounded-2xl border ${themeClasses.border}`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className={isDarkTheme ? 'bg-white/[0.04]' : 'bg-slate-50'}>
              <tr>
                {['Month', 'In Plan', 'In Actual', 'Out Plan', 'Out Actual', 'Cost'].map((h) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-wider ${themeClasses.textSecondary}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${themeClasses.border}`}>
              {records.map((row) => {
                const isCurrent = costRecordMatchesPeriod(row.month_year, month, year);
                return (
                  <tr
                    key={String(row.id ?? row.month_year)}
                    className={isCurrent ? (isDarkTheme ? 'bg-indigo-500/10' : 'bg-indigo-50') : themeClasses.bgHover}
                  >
                    <td className={`px-3 py-2.5 font-semibold ${themeClasses.textPrimary}`}>{row.month_year}</td>
                    <td className="px-3 py-2.5 tabular-nums text-emerald-600">{formatInr(row.cash_in_monthly_plan)}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold text-emerald-600">
                      {formatInr(row.cash_in_monthly_actual)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-rose-500">{formatInr(row.cash_out_monthly_plan)}</td>
                    <td className="px-3 py-2.5 tabular-nums font-bold text-rose-500">
                      {formatInr(row.cash_out_monthly_actual)}
                    </td>
                    <td className={`px-3 py-2.5 tabular-nums ${themeClasses.textPrimary}`}>
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
