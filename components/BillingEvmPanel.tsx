import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Wallet } from 'lucide-react';
import type { User, ContractValueType, InvoiceType, InvoicingRecord, ContractValueRecord } from '../types';
import {
  getApiErrorMessage,
  saveBudgetPerformanceForPeriod,
  saveCostPerformanceForPeriod,
} from '../services/api';
import { fetchFinancialDataSnapshot } from '../services/financialDataService';
import {
  deriveFinancialExecutiveMetrics,
  type FinancialExecutiveMetrics,
} from '../utils/financialDashboardMetrics';
import {
  extractRecordId,
  formatFinancialMonthYear,
} from '../utils/financialPeriod';
import { monthYearLabel } from '../utils/healthSafety';
import { fetchCostPerformanceTrend, parseBillingNumeric } from '../utils/billingEvmAnalytics';
import FinancialQuickUpdateCard, {
  FinancialFormGrid,
  financialFieldInput,
  financialFieldLabel,
} from './financial/FinancialQuickUpdateCard';
import FinancialTabAnalytics from './financial/FinancialTabAnalytics';
import BillingEvmCharts from './BillingEvmCharts';
import BillingSection from './billing/BillingSection';
import { getBillingTheme } from '../utils/billingDashboardTheme';
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

const BUDGET_PERFORMANCE_FIELDS = ['bac', 'bcwp', 'acwp'] as const;

const BUDGET_PERFORMANCE_FIELD_META: Record<
  (typeof BUDGET_PERFORMANCE_FIELDS)[number],
  { label: string; abbrev: string; placeholder: string; tooltip: string }
> = {
  bac: {
    label: 'Budget at Completion',
    abbrev: 'BAC',
    placeholder: 'Enter total approved project budget',
    tooltip: 'Total approved budget for the project at completion (BAC).',
  },
  bcwp: {
    label: 'Budgeted Cost of Work Performed (Earned Value)',
    abbrev: 'BCWP',
    placeholder: 'Enter earned value achieved',
    tooltip: 'Earned value of work performed against the budget (BCWP).',
  },
  acwp: {
    label: 'Actual Cost of Work Performed',
    abbrev: 'ACWP',
    placeholder: 'Enter actual expenditure incurred',
    tooltip: 'Actual cost incurred for work performed (ACWP).',
  },
};

type EvmTab = 'cost' | 'budget';

interface BillingEvmPanelProps {
  projectName: string;
  user: User;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

const BillingEvmPanel: React.FC<BillingEvmPanelProps> = ({ projectName, user, onToast }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const billing = getBillingTheme(isDarkTheme, themeClasses);

  const [activeTab, setActiveTab] = useState<EvmTab>('cost');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [progressForm, setProgressForm] = useState<Record<string, unknown>>({});
  const [costForm, setCostForm] = useState<Record<string, unknown>>({});
  const [budgetForm, setBudgetForm] = useState<Record<string, unknown>>({});
  const [invoicingForms, setInvoicingForms] = useState<Record<InvoiceType, InvoicingRecord | null>>({
    PMC: null,
    Contractor: null,
  });
  const [contractValuesForms, setContractValuesForms] = useState<
    Record<ContractValueType, ContractValueRecord | null>
  >({ SCL: null, Contractor: null });
  const [trendData, setTrendData] = useState<Awaited<ReturnType<typeof fetchCostPerformanceTrend>>>([]);

  const selectedMonthNumber = MONTHS.indexOf(selectedMonth) + 1;
  const selectedYearNumber = parseInt(selectedYear, 10) || new Date().getFullYear();
  const periodLabel = monthYearLabel(selectedMonthNumber, selectedYearNumber);

  const roleForSubmission = 'Billing Site Engineer';
  const createdBy = user.name || user.username || user.email || 'Billing Site Engineer';

  const fieldLabel = financialFieldLabel(isDarkTheme, themeClasses);
  const fieldInput = financialFieldInput(isDarkTheme, themeClasses);

  const loadData = useCallback(async () => {
    if (!projectName) return;
    setLoading(true);
    try {
      const [snapshot, trend] = await Promise.all([
        fetchFinancialDataSnapshot({
          projectName,
          month: selectedMonthNumber,
          year: selectedYearNumber,
          roleForSubmission,
        }),
        fetchCostPerformanceTrend(projectName, roleForSubmission),
      ]);
      setProgressForm(snapshot.progressForm ?? {});
      setCostForm(snapshot.costForm ?? {});
      setBudgetForm(snapshot.budgetForm ?? {});
      setInvoicingForms(snapshot.invoicingForms ?? { PMC: null, Contractor: null });
      setContractValuesForms(snapshot.contractValuesForms ?? { SCL: null, Contractor: null });
      setTrendData(trend);
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Failed to load EVM data.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [projectName, selectedMonthNumber, selectedYearNumber, onToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
      onToast('EVM data refreshed.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleReset = () => {
    void loadData();
  };

  const showSuccess = (message: string) => {
    setSuccessBanner(message);
    onToast(message);
    window.setTimeout(() => setSuccessBanner(null), 4000);
  };

  const saveCost = async () => {
    if (!projectName) return;
    setSaving(true);
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
      showSuccess('Financial progress saved successfully.');
      const trend = await fetchCostPerformanceTrend(projectName, roleForSubmission);
      setTrendData(trend);
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Failed to save financial progress.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveBudget = async () => {
    if (!projectName) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        month_year: formatFinancialMonthYear(selectedMonthNumber, selectedYearNumber),
        bac: parseBillingNumeric(budgetForm.bac),
        bcwp: parseBillingNumeric(budgetForm.bcwp),
        acwp: parseBillingNumeric(budgetForm.acwp),
        project_name: projectName,
        role: roleForSubmission,
      };

      const response = await saveBudgetPerformanceForPeriod(payload, {
        projectName,
        month: selectedMonthNumber,
        year: selectedYearNumber,
        role: roleForSubmission,
        existingId: extractRecordId(budgetForm),
      });

      const saved =
        (response?.data as { results?: Record<string, unknown>[] })?.results?.[0] ??
        (response?.data as Record<string, unknown>) ??
        {};
      setBudgetForm((prev) => ({
        ...prev,
        ...payload,
        ...saved,
        id: extractRecordId(saved) ?? extractRecordId(prev),
      }));
      showSuccess('Budget vs cost saved successfully.');
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Failed to save budget vs cost.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const executiveMetrics: FinancialExecutiveMetrics = useMemo(
    () =>
      deriveFinancialExecutiveMetrics({
        progressForm,
        costForm,
        budgetForm,
        invoicingForms,
        contractValuesForms,
      }),
    [progressForm, costForm, budgetForm, invoicingForms, contractValuesForms],
  );

  const tabs: { key: EvmTab; label: string; icon: React.ElementType }[] = [
    { key: 'cost', label: 'Financial Progress', icon: BarChart3 },
    { key: 'budget', label: 'Budget vs Cost', icon: Wallet },
  ];

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1].map(String);
  }, []);

  const periodControls = (
    <>
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
      icon={<BarChart3 size={20} strokeWidth={2.25} />}
      title="EVM & Budget Performance"
      subtitle={`Financial progress · Budget vs cost · ${periodLabel}`}
      actions={periodControls}
    >
      <div className={billing.tabList} role="tablist">
        {tabs.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(key)}
              className={isActive ? billing.tabActive : billing.tabInactive}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {loading && !costForm.month_year && !budgetForm.bac ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className={billing.spinnerSm} />
        </div>
      ) : (
        <>
          {activeTab === 'cost' && (
            <div className="space-y-5">
              <FinancialQuickUpdateCard
                title="Update Financial Progress"
                projectName={projectName}
                periodLabel={periodLabel}
                successBanner={successBanner}
                onSave={() => void saveCost()}
                onReset={handleReset}
                onRefresh={() => void handleRefresh()}
                saving={saving}
                refreshDisabled={refreshing}
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
                        onChange={(e) => setCostForm((prev) => ({ ...prev, [key]: e.target.value }))}
                        className={fieldInput}
                      />
                    </div>
                  ))}
                </FinancialFormGrid>
              </FinancialQuickUpdateCard>

              <BillingEvmCharts
                variant="cost"
                costForm={costForm}
                budgetForm={budgetForm}
                cpi={executiveMetrics.cpi}
                spi={executiveMetrics.spi}
                trendData={trendData}
              />

              <div className={billing.innerCard}>
                <FinancialTabAnalytics
                  variant="cost"
                  metrics={executiveMetrics}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                  projectName={projectName}
                  costForm={costForm}
                />
              </div>
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="space-y-5">
              <FinancialQuickUpdateCard
                title="Update Budget vs Cost"
                projectName={projectName}
                periodLabel={periodLabel}
                successBanner={successBanner}
                onSave={() => void saveBudget()}
                onReset={handleReset}
                onRefresh={() => void handleRefresh()}
                saving={saving}
                refreshDisabled={refreshing}
                isDarkTheme={isDarkTheme}
                themeClasses={themeClasses}
              >
                <FinancialFormGrid>
                  {BUDGET_PERFORMANCE_FIELDS.map((key) => {
                    const meta = BUDGET_PERFORMANCE_FIELD_META[key];
                    return (
                      <div key={key}>
                        <label
                          className={fieldLabel}
                          htmlFor={`billing-budget-${key}`}
                          title={meta.tooltip}
                        >
                          {meta.label} ({meta.abbrev})
                        </label>
                        <input
                          id={`billing-budget-${key}`}
                          type="text"
                          value={String(budgetForm[key] ?? '')}
                          onChange={(e) =>
                            setBudgetForm((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder={meta.placeholder}
                          className={fieldInput}
                        />
                      </div>
                    );
                  })}
                </FinancialFormGrid>
              </FinancialQuickUpdateCard>

              <BillingEvmCharts
                variant="budget"
                costForm={costForm}
                budgetForm={budgetForm}
                cpi={executiveMetrics.cpi}
                spi={executiveMetrics.spi}
                trendData={trendData}
              />

              <div className={billing.innerCard}>
                <FinancialTabAnalytics
                  variant="budget"
                  metrics={executiveMetrics}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                  projectName={projectName}
                  budgetForm={budgetForm}
                />
              </div>
            </div>
          )}
        </>
      )}
    </BillingSection>
  );
};

export default BillingEvmPanel;
