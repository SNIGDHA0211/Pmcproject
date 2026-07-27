import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Pencil, TrendingUp, X } from 'lucide-react';
import type { User } from '../types';
import {
  calculateContractPerformance,
  contractPerformanceApi,
  getApiErrorMessage,
  normalizeContractPerformanceRecord,
  saveContractPerformanceRecord,
  saveCostPerformanceForPeriod,
  unwrapList,
} from '../services/api';
import { fetchFinancialDataSnapshot } from '../services/financialDataService';
import { parseBillingNumeric } from '../utils/billingEvmAnalytics';
import { formatIndianCurrencyCompact } from '../utils/format';
import { extractRecordId, formatFinancialMonthYear } from '../utils/financialPeriod';
import { monthYearLabel } from '../utils/healthSafety';
import { KPI_METRIC_COLORS } from '../utils/dashboardSemanticColors';
import { getBillingTheme } from '../utils/billingDashboardTheme';
import BillingSection from './billing/BillingSection';
import FinancialQuickUpdateCard, {
  FinancialFormGrid,
  financialFieldInput,
  financialFieldLabel,
} from './financial/FinancialQuickUpdateCard';
import PerformanceHighlightCard, {
  getCollectionPerformanceStatus,
  getCostPerformanceStatus,
} from './PerformanceHighlightCard';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';
import { getThemeClasses, useTheme } from '../utils/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const COST_EVM_FIELD_LABELS: Record<string, string> = {
  month_year: 'Month / Year',
  bcws: 'Budgeted Cost of Work Scheduled',
  bcwp: 'Budgeted Cost of Work Performed',
  acwp: 'Actual Cost of Work Performed',
  fcst: 'Forecast at Completion',
  bac: 'Budget at Completion',
};

const COST_EVM_FORM_FIELDS = ['month_year', 'bcws', 'bcwp', 'acwp', 'fcst', 'bac'] as const;

interface BillingPerformancePanelProps {
  projectName: string;
  user: User;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

const BillingPerformancePanel: React.FC<BillingPerformancePanelProps> = ({
  projectName,
  user,
  onToast,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const billing = getBillingTheme(isDarkTheme, themeClasses);

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [savingCost, setSavingCost] = useState(false);
  const [savingContract, setSavingContract] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [costForm, setCostForm] = useState<Record<string, unknown>>({});
  const [contractPerformance, setContractPerformance] = useState<ReturnType<typeof normalizeContractPerformanceRecord> | null>(null);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    billedValue: 0,
    actualReceiptValue: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const selectedMonthNumber = MONTHS.indexOf(selectedMonth) + 1;
  const selectedYearNumber = parseInt(selectedYear, 10) || new Date().getFullYear();
  const periodLabel = monthYearLabel(selectedMonthNumber, selectedYearNumber);
  const roleForSubmission = 'Billing Site Engineer';
  const createdBy = user.name || user.username || user.email || 'Billing Site Engineer';

  const fieldLabel = financialFieldLabel(isDarkTheme, themeClasses);
  const fieldInput = financialFieldInput(isDarkTheme, themeClasses);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1].map(String);
  }, []);

  const loadCostData = useCallback(async () => {
    if (!projectName) return;
    setLoading(true);
    try {
      const snapshot = await fetchFinancialDataSnapshot({
        projectName,
        month: selectedMonthNumber,
        year: selectedYearNumber,
        roleForSubmission,
      });
      setCostForm(snapshot.costForm ?? {});
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Failed to load internal cost performance.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [projectName, selectedMonthNumber, selectedYearNumber, onToast]);

  const loadContractData = useCallback(async () => {
    if (!projectName) return;
    setContractLoading(true);
    setContractError(null);
    try {
      const response = await contractPerformanceApi.getContractPerformance({ project_name: projectName });
      const row = unwrapList(response.data)[0];
      setContractPerformance(row ? normalizeContractPerformanceRecord(row) : null);
    } catch (error) {
      setContractPerformance(null);
      setContractError(getApiErrorMessage(error, 'Unable to load contract performance'));
    } finally {
      setContractLoading(false);
    }
  }, [projectName]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadCostData(), loadContractData()]);
  }, [loadCostData, loadContractData]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const showSuccess = (message: string) => {
    setSuccessBanner(message);
    onToast(message);
    window.setTimeout(() => setSuccessBanner(null), 4000);
  };

  const bcwp = parseBillingNumeric(costForm.bcwp);
  const ac = parseBillingNumeric(costForm.acwp);
  const costVariance = bcwp - ac;
  const cpiGaugePct = ac > 0 ? (bcwp / ac) * 100 : 0;

  const billedValue = contractPerformance?.billedValue ?? 0;
  const actualReceiptValue = contractPerformance?.actualReceiptValue ?? 0;
  const receiptVariance = contractPerformance?.variance ?? billedValue - actualReceiptValue;
  const performancePercentage = contractPerformance?.performancePercentage ?? 0;

  const saveCost = async () => {
    if (!projectName) return;
    setSavingCost(true);
    try {
      const payload = {
        month_year: String(costForm.month_year ?? formatFinancialMonthYear(selectedMonthNumber, selectedYearNumber)),
        bcws: parseBillingNumeric(costForm.bcws),
        bcwp: parseBillingNumeric(costForm.bcwp),
        acwp: parseBillingNumeric(costForm.acwp),
        fcst: parseBillingNumeric(costForm.fcst),
        bac: parseBillingNumeric(costForm.bac),
        project_name: projectName,
        role: roleForSubmission,
        ...(!extractRecordId(costForm) ? { created_by: createdBy } : {}),
      };

      const response = await saveCostPerformanceForPeriod(payload, {
        projectName,
        month: selectedMonthNumber,
        year: selectedYearNumber,
        role: roleForSubmission,
        existingId: extractRecordId(costForm),
      });

      const saved =
        (response?.data as { results?: Record<string, unknown>[] })?.results?.[0] ??
        (response?.data as Record<string, unknown>) ??
        {};
      setCostForm((prev) => ({
        ...prev,
        ...payload,
        ...saved,
        id: extractRecordId(saved) ?? extractRecordId(prev),
      }));
      showSuccess('Internal cost performance saved.');
      setEditingCost(false);
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Failed to save internal cost performance.'), 'error');
    } finally {
      setSavingCost(false);
    }
  };

  const openContractEdit = () => {
    setContractForm({
      billedValue: contractPerformance?.billedValue ?? 0,
      actualReceiptValue: contractPerformance?.actualReceiptValue ?? 0,
    });
    setFormError(null);
    setContractModalOpen(true);
  };

  const saveContract = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingContract(true);
    setFormError(null);
    try {
      await saveContractPerformanceRecord(
        {
          project_name: projectName,
          billedValue: contractForm.billedValue,
          actualReceiptValue: contractForm.actualReceiptValue,
          // COS is edited under Contract Values; keep backend NOT NULL happy.
          cosExtraItem: contractPerformance?.cosExtraItem ?? 0,
        },
        contractPerformance?.id,
      );
      showSuccess('Contract performance saved.');
      setContractModalOpen(false);
      await loadContractData();
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Failed to save contract performance.'));
    } finally {
      setSavingContract(false);
    }
  };

  const contractPreview = calculateContractPerformance(contractForm.billedValue, contractForm.actualReceiptValue);

  const periodControls = (
    <>
      <span className={billing.label}>Period</span>
      <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={billing.select}>
        {MONTHS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className={billing.select}>
        {yearOptions.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </>
  );

  return (
    <BillingSection
      icon={<TrendingUp size={20} strokeWidth={2.25} />}
      title="Performance Monitoring"
      subtitle={`Internal cost · Contract performance · ${periodLabel}`}
      actions={periodControls}
    >
      {successBanner && <p className={billing.successBanner}>{successBanner}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={billing.innerCard}>
          <div className={`mb-0 flex items-center justify-between gap-2 border-b pb-2 ${billing.divider}`}>
            <p className={billing.label}>Internal Cost Performance</p>
            <button
              type="button"
              onClick={() => setEditingCost((v) => !v)}
              className={
                editingCost
                  ? `${billing.btnGhost} bg-rose-500/15 text-rose-500`
                  : billing.btnPrimarySm
              }
            >
              {editingCost ? <X size={12} /> : <Pencil size={12} />}
              {editingCost ? 'Close' : 'Edit'}
            </button>
          </div>
          <PerformanceHighlightCard
            className="!min-h-[280px] !rounded-none !border-0 !shadow-none"
            title="INTERNAL COST PERFORMANCE"
            icon={<Icons.Finance size={14} />}
            performancePercent={cpiGaugePct}
            performanceLabel="Cost Performance Index"
            status={getCostPerformanceStatus(cpiGaugePct)}
            isLoading={loading}
            metrics={[
              { label: 'BCWP', value: formatIndianCurrencyCompact(bcwp), valueClassName: KPI_METRIC_COLORS.primary },
              { label: 'AC', value: formatIndianCurrencyCompact(ac), valueClassName: KPI_METRIC_COLORS.primary },
              {
                label: 'Variance',
                value: formatIndianCurrencyCompact(costVariance, { showSign: true }),
                valueClassName: costVariance >= 0 ? KPI_METRIC_COLORS.positive : KPI_METRIC_COLORS.negative,
              },
            ]}
          />
          {editingCost && (
            <div className={`mt-3 border-t pt-3 ${billing.divider}`}>
              <FinancialQuickUpdateCard
                title="Update Internal Cost Performance"
                projectName={projectName}
                periodLabel={periodLabel}
                onSave={() => void saveCost()}
                onReset={() => void loadCostData()}
                onRefresh={() => void loadCostData()}
                saving={savingCost}
                footerNote={
                  !extractRecordId(costForm)
                    ? 'No saved record for this period — enter EVM values and save.'
                    : undefined
                }
                isDarkTheme={isDarkTheme}
                themeClasses={themeClasses}
              >
                <FinancialFormGrid>
                  {COST_EVM_FORM_FIELDS.map((key) => (
                    <div key={key}>
                      <label className={fieldLabel} htmlFor={`billing-cost-${key}`}>
                        {COST_EVM_FIELD_LABELS[key]}
                      </label>
                      <input
                        id={`billing-cost-${key}`}
                        type="text"
                        value={String(costForm[key] ?? '')}
                        onChange={(e) => setCostForm({ ...costForm, [key]: e.target.value })}
                        className={fieldInput}
                      />
                    </div>
                  ))}
                </FinancialFormGrid>
              </FinancialQuickUpdateCard>
            </div>
          )}
        </div>

        <div className={billing.innerCard}>
          <div className={`mb-0 flex items-center justify-between gap-2 border-b pb-2 ${billing.divider}`}>
            <p className={billing.label}>Contract Performance</p>
            <button type="button" onClick={openContractEdit} className={billing.btnPrimarySm}>
              <Pencil size={12} />
              {contractPerformance ? 'Edit' : 'Add'}
            </button>
          </div>
          <PerformanceHighlightCard
            className="!min-h-[280px] !rounded-none !border-0 !shadow-none"
            title="CONTRACT PERFORMANCE"
            icon={<FileText size={14} />}
            performancePercent={contractPerformance ? performancePercentage : 0}
            performanceLabel="Collection Performance"
            status={getCollectionPerformanceStatus(contractPerformance ? performancePercentage : 0)}
            isLoading={contractLoading}
            error={contractError}
            emptyMessage="No contract performance data"
            isEmpty={!contractLoading && !contractError && !contractPerformance}
            metrics={
              contractPerformance
                ? [
                  {
                    label: 'Billed Value',
                    value: formatIndianCurrencyCompact(billedValue),
                    valueClassName: KPI_METRIC_COLORS.primary,
                  },
                  {
                    label: 'Receipt Value',
                    value: formatIndianCurrencyCompact(actualReceiptValue),
                    valueClassName: KPI_METRIC_COLORS.primary,
                  },
                  {
                    label: 'Variance',
                    value: formatIndianCurrencyCompact(receiptVariance, { showSign: true }),
                    valueClassName: receiptVariance >= 0 ? KPI_METRIC_COLORS.positive : KPI_METRIC_COLORS.negative,
                  },
                ]
                : [
                  { label: 'Billed Value', value: '—', valueClassName: KPI_METRIC_COLORS.primary },
                  { label: 'Receipt Value', value: '—', valueClassName: KPI_METRIC_COLORS.primary },
                  { label: 'Variance', value: '—', valueClassName: KPI_METRIC_COLORS.muted },
                ]
            }
          />
        </div>
      </div>

      {contractModalOpen && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[100040] flex items-center justify-center bg-black/50 p-4">
            <div
              className={`max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5 shadow-2xl ${themeClasses.glassCard} ${themeClasses.border}`}
            >
              <h4 className={`mb-4 font-black uppercase ${themeClasses.textPrimary}`}>Contract Performance</h4>
              <form onSubmit={saveContract} className="space-y-3">
                <div>
                  <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>
                    Billed Value
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={contractForm.billedValue}
                    onChange={(e) =>
                      setContractForm((p) => ({ ...p, billedValue: Number(e.target.value) || 0 }))
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-sm ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
                  />
                </div>
                <div>
                  <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>
                    Actual Receipt Value
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={contractForm.actualReceiptValue}
                    onChange={(e) =>
                      setContractForm((p) => ({ ...p, actualReceiptValue: Number(e.target.value) || 0 }))
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-sm ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
                  />
                </div>
                <div className={billing.metricTile}>
                  <p className={billing.metricLabel}>Preview</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <span className={themeClasses.textSecondary}>Variance</span>
                    <span className={`font-bold tabular-nums ${themeClasses.textPrimary}`}>
                      {formatIndianCurrencyCompact(contractPreview.variance, { showSign: true })}
                    </span>
                    <span className={themeClasses.textSecondary}>Performance</span>
                    <span className={`font-bold tabular-nums ${themeClasses.textPrimary}`}>
                      {contractPreview.performancePercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {formError && <p className="text-xs text-rose-500">{formError}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => !savingContract && setContractModalOpen(false)} className={billing.btnSecondary}>
                    Cancel
                  </button>
                  <button type="submit" disabled={savingContract} className={billing.btnSave}>
                    {savingContract ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </BillingSection>
  );
};

export default BillingPerformancePanel;
