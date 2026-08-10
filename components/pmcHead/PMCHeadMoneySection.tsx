import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import type { ContractValueRecord, InvoicingRecord } from '../../types';
import type { ContractorMasterRecord } from '../../types/contractorManagement';
import { formatIndianCurrencyCompact, formatIndianCurrencyFull } from '../../utils/format';
import {
  getCertificationSemanticTone,
  getCertificationStatusLabel,
  getGrowthSemanticTone,
  semanticBarFillClass,
  semanticBadgeClass,
  semanticValueClass,
} from '../../utils/dashboardSemanticColors';
import { usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';
import CmContractorSelector, {
  CM_CUMULATIVE_VIEW_LABEL,
} from '../contractor/ui/CmContractorSelector';

const partyAccent = (party: 'SCL' | 'Contractor') =>
  party === 'SCL'
    ? {
        header: 'from-blue-700 to-blue-900',
        chip: 'bg-blue-100 text-blue-800',
        ring: 'ring-blue-200',
        dot: 'bg-blue-600',
      }
    : {
        header: 'from-rose-600 to-rose-800',
        chip: 'bg-rose-100 text-rose-800',
        ring: 'ring-rose-200',
        dot: 'bg-rose-600',
      };

const MetricCell: React.FC<{
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
  fullValue?: string;
  emphasize?: boolean;
}> = ({ label, value, tone = 'neutral', fullValue, emphasize = false }) => {
  const ex = usePmcExecutiveTheme();
  return (
    <div className={`${ex.metricCell} ${emphasize ? 'sm:col-span-2' : ''}`}>
      <p className={`text-[10px] font-bold uppercase leading-tight tracking-wide ${ex.label}`}>
        {label}
      </p>
      <p
        className={`mt-1 break-words text-sm font-black leading-snug tabular-nums sm:text-[15px] ${semanticValueClass(tone, ex.isDark)}`}
        title={fullValue ?? value}
      >
        {value}
      </p>
    </div>
  );
};

const ProgressInsight: React.FC<{
  title: string;
  subtitle: string;
  percent: number;
  tone: 'positive' | 'negative' | 'warning' | 'neutral';
  badge: string;
  footnote: string;
}> = ({ title, subtitle, percent, tone, badge, footnote }) => {
  const ex = usePmcExecutiveTheme();
  const displayPct = Math.round(Math.abs(percent) < 0.5 ? 0 : percent);
  const barPct = Math.min(100, Math.max(0, Math.abs(displayPct)));
  return (
    <div className={ex.progressInsight}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-black uppercase tracking-wide sm:text-sm ${ex.heading}`}>{title}</p>
          <p className={`mt-0.5 text-[11px] sm:text-xs ${ex.muted}`}>{subtitle}</p>
        </div>
        <p className={`shrink-0 text-2xl font-black tabular-nums sm:text-3xl ${semanticValueClass(tone, ex.isDark)}`}>
          {displayPct === 0 ? '0%' : `${displayPct}%`}
        </p>
      </div>
      <div className={`mt-4 h-2.5 overflow-hidden rounded-full ${ex.isDark ? 'bg-white/10' : 'bg-slate-200/80'}`}>
        <div
          className={`h-full rounded-full transition-all ${semanticBarFillClass(tone)}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold sm:text-xs ${semanticBadgeClass(tone, ex.isDark)}`}>
          {tone === 'negative' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
          {badge}
        </span>
        <span className={`text-[11px] font-medium sm:text-xs ${ex.muted}`}>{footnote}</span>
      </div>
    </div>
  );
};

const PartyFinanceCard: React.FC<{
  party: 'SCL' | 'Contractor';
  partyLabel?: string;
  contract: ContractValueRecord | null;
  invoicing: InvoicingRecord | null;
  contractLoading: boolean;
  invoicingLoading: boolean;
  contractError: string | null;
  invoicingError: string | null;
  contractSectionId?: string;
  invoicingSectionId?: string;
}> = ({
  party,
  partyLabel,
  contract,
  invoicing,
  contractLoading,
  invoicingLoading,
  contractError,
  invoicingError,
  contractSectionId,
  invoicingSectionId,
}) => {
  const ex = usePmcExecutiveTheme();
  const accent = partyAccent(party);
  const loading = contractLoading || invoicingLoading;
  const displayName = partyLabel ?? party;

  if (loading) {
    return (
      <div className={`overflow-hidden ${ex.surface}`}>
        <div className={`h-20 animate-pulse bg-gradient-to-r ${accent.header}`} />
        <div className="space-y-3 p-4">
          <div className={`h-24 animate-pulse rounded-xl ${ex.skeleton}`} />
          <div className={`h-32 animate-pulse rounded-xl ${ex.skeleton}`} />
        </div>
      </div>
    );
  }

  if ((contractError && !contract) || (invoicingError && !invoicing)) {
    return (
      <div className={`flex min-h-[280px] items-center justify-center p-6 text-center ${ex.emptyState}`}>
        <p className={`text-sm font-semibold ${ex.roseText}`}>{contractError || invoicingError}</p>
      </div>
    );
  }

  const growthPctRaw = contract?.growthPercentage ?? contract?.approvedVOPercentage ?? 0;
  const growthPct = Math.abs(growthPctRaw) < 0.5 ? 0 : growthPctRaw;
  const growthTone = growthPct === 0 ? 'neutral' : getGrowthSemanticTone(growthPct);
  const growthBadge =
    growthPct === 0
      ? 'No change'
      : `${Math.abs(growthPct).toFixed(0)}% ${growthPct > 0 ? 'growth' : 'decline'}`;
  const certPct = invoicing?.collectionPercentage ?? 0;
  const certTone = getCertificationSemanticTone(certPct);
  const certLabel = getCertificationStatusLabel(certPct);

  return (
    <article className={`overflow-hidden ring-1 ${ex.surface} ${accent.ring}`}>
      <header className={`bg-gradient-to-r px-4 py-4 text-white sm:px-5 sm:py-5 ${accent.header}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Building2 size={22} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Portfolio</p>
              <h3 className="truncate text-xl font-black tracking-tight sm:text-2xl">{displayName}</h3>
            </div>
          </div>
          {contract && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">Revised value</p>
              <p
                className="whitespace-nowrap text-base font-black tabular-nums sm:text-lg"
                title={formatIndianCurrencyFull(contract.revisedContractValue)}
              >
                {formatIndianCurrencyCompact(contract.revisedContractValue)}
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="space-y-5 p-4 sm:p-5">
        <section id={contractSectionId}>
          <div className="mb-3 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
            <h4 className={`text-xs font-black uppercase tracking-wide sm:text-sm ${ex.heading}`}>Contract portfolio</h4>
          </div>
          {contract ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
                <MetricCell
                  label="Original"
                  value={formatIndianCurrencyCompact(contract.originalContractValue)}
                  fullValue={formatIndianCurrencyFull(contract.originalContractValue)}
                />
                <MetricCell
                  label="Excess"
                  value={formatIndianCurrencyCompact(contract.approvedVO)}
                  tone="positive"
                  fullValue={formatIndianCurrencyFull(contract.approvedVO)}
                />
                <MetricCell
                  label="COS Extra Item"
                  value={formatIndianCurrencyCompact(contract.cosExtraItem ?? 0)}
                  fullValue={formatIndianCurrencyFull(contract.cosExtraItem ?? 0)}
                />
                <MetricCell
                  label="Saving"
                  value={formatIndianCurrencyCompact(contract.potentialPendingVO)}
                  tone={contract.potentialPendingVO > 0 ? 'negative' : 'neutral'}
                  fullValue={formatIndianCurrencyFull(contract.potentialPendingVO)}
                />
                <MetricCell
                  label="Revised"
                  value={formatIndianCurrencyCompact(contract.revisedContractValue)}
                  fullValue={formatIndianCurrencyFull(contract.revisedContractValue)}
                  emphasize
                />
              </div>
              <div className="mt-4">
                <ProgressInsight
                  title="Contract value growth"
                  subtitle="Revised vs original contract"
                  percent={growthPct}
                  tone={growthTone}
                  badge={growthBadge}
                  footnote="Growth over original contract value"
                />
              </div>
            </>
          ) : (
            <p className={`text-sm ${ex.muted}`}>No contract data</p>
          )}
        </section>

        <div className={ex.dividerGradient} />

        <section id={invoicingSectionId}>
          <div className="mb-3 flex items-center gap-2">
            <Receipt size={14} className={ex.muted} />
            <h4 className={`text-xs font-black uppercase tracking-wide sm:text-sm ${ex.heading}`}>Billing & certification</h4>
          </div>
          {invoicing ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <MetricCell
                  label="Gross billed"
                  value={formatIndianCurrencyCompact(invoicing.grossBilled)}
                  fullValue={formatIndianCurrencyFull(invoicing.grossBilled)}
                />
                <MetricCell
                  label="Certified"
                  value={formatIndianCurrencyCompact(invoicing.netBilledWithoutVAT)}
                  fullValue={formatIndianCurrencyFull(invoicing.netBilledWithoutVAT)}
                />
                <MetricCell
                  label="Difference"
                  value={formatIndianCurrencyCompact(invoicing.netCollected)}
                  tone={(invoicing.netCollected ?? 0) >= 0 ? 'positive' : 'negative'}
                  fullValue={formatIndianCurrencyFull(invoicing.netCollected)}
                />
                <MetricCell
                  label="Efficiency"
                  value={`${Math.round(certPct)}%`}
                  tone={certTone}
                />
              </div>
              <div className="mt-4">
                <ProgressInsight
                  title="Certification efficiency"
                  subtitle="Certified billed vs gross billed"
                  percent={certPct}
                  tone={certTone}
                  badge={certLabel}
                  footnote="Target ≥ 90%"
                />
              </div>
            </>
          ) : (
            <p className={`text-sm ${ex.muted}`}>No invoicing data</p>
          )}
        </section>
      </div>
    </article>
  );
};

export interface PMCHeadMoneySectionProps {
  sclContractValue: ContractValueRecord | null;
  contractorContractValue: ContractValueRecord | null;
  contractorDisplayName?: string;
  pmcInvoicing: InvoicingRecord | null;
  contractorInvoicing: InvoicingRecord | null;
  isLoadingContractValues?: boolean;
  sclContractError?: string | null;
  contractorContractError?: string | null;
  isLoadingInvoicing?: boolean;
  pmcInvoicingError?: string | null;
  contractorInvoicingError?: string | null;
  /** Active contractor masters for the View selector (same as Contractor Management). */
  contractors?: ContractorMasterRecord[];
  /** null = Cumulative (All Contractors) */
  selectedContractorViewId?: number | null;
  onContractorViewChange?: (id: number | null) => void;
}

const PMCHeadMoneySection: React.FC<PMCHeadMoneySectionProps> = ({
  sclContractValue,
  contractorContractValue,
  contractorDisplayName,
  pmcInvoicing,
  contractorInvoicing,
  isLoadingContractValues = false,
  sclContractError = null,
  contractorContractError = null,
  isLoadingInvoicing = false,
  pmcInvoicingError = null,
  contractorInvoicingError = null,
  contractors = [],
  selectedContractorViewId = null,
  onContractorViewChange,
}) => {
  const ex = usePmcExecutiveTheme();
  const totalRevised =
    (sclContractValue?.revisedContractValue ?? 0) +
    (contractorContractValue?.revisedContractValue ?? 0);
  const totalBilled =
    (pmcInvoicing?.grossBilled ?? 0) + (contractorInvoicing?.grossBilled ?? 0);
  const sclCert = pmcInvoicing?.collectionPercentage ?? 0;
  const coCert = contractorInvoicing?.collectionPercentage ?? 0;
  const avgCert =
    pmcInvoicing && contractorInvoicing ? Math.round((sclCert + coCert) / 2) : sclCert || coCert;
  const totalGap =
    (pmcInvoicing?.netCollected ?? 0) + (contractorInvoicing?.netCollected ?? 0);

  const summaryLoading = isLoadingContractValues || isLoadingInvoicing;
  const showContractorSelector = Boolean(onContractorViewChange) && contractors.length > 0;
  const contractorCardLabel =
    selectedContractorViewId == null
      ? CM_CUMULATIVE_VIEW_LABEL
      : contractorDisplayName?.trim() || 'Contractor';
  const contractorSubLabel =
    selectedContractorViewId == null ? 'All contractors' : 'Selected contractor';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Executive money snapshot */}
      <section className={`overflow-hidden ${ex.surface}`}>
        <div className={`border-b px-4 py-3 sm:px-5 ${ex.borderSubtle} ${ex.surfaceMuted}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <CircleDollarSign size={18} className={ex.isDark ? 'text-blue-400' : 'text-[#1e3a5f]'} />
              <div className="min-w-0">
                <h2 className={ex.panelTitle}>Financial command snapshot</h2>
                <p className={`mt-0.5 truncate text-[11px] font-medium ${ex.muted}`}>
                  Viewing · {contractorCardLabel}
                </p>
              </div>
            </div>
            {showContractorSelector && (
              <CmContractorSelector
                contractors={contractors}
                value={selectedContractorViewId}
                onChange={onContractorViewChange!}
                includeCumulativeOption
                showNumbering={false}
                label="View"
                className="w-full sm:w-[240px] sm:shrink-0 lg:w-[280px]"
              />
            )}
          </div>
        </div>
        <div className={`grid grid-cols-2 gap-px lg:grid-cols-4 ${ex.summaryGridGap}`}>
          {[
            {
              label: 'Combined revised contract',
              value: summaryLoading ? '—' : formatIndianCurrencyCompact(totalRevised),
              sub: `SCL + ${contractorSubLabel}`,
            },
            {
              label: 'Total gross billed',
              value: summaryLoading ? '—' : formatIndianCurrencyCompact(totalBilled),
              sub: 'Portfolio billing',
            },
            {
              label: 'Avg certification',
              value: summaryLoading ? '—' : `${avgCert}%`,
              sub: 'Billing efficiency',
              accent: avgCert >= 90 ? ex.emeraldText : avgCert >= 75 ? ex.amberText : ex.roseText,
            },
            {
              label: 'Certification gap',
              value: summaryLoading ? '—' : formatIndianCurrencyCompact(totalGap),
              sub: 'Uncertified balance',
              accent: totalGap >= 0 ? ex.emeraldText : ex.roseText,
            },
          ].map((item) => (
            <div key={item.label} className={`px-3 py-4 sm:px-4 sm:py-5 ${ex.summaryGridCell}`}>
              <p className={ex.kpiLabel}>{item.label}</p>
              <p className={`mt-1 text-xl font-black tabular-nums sm:text-2xl ${item.accent ?? ex.headingStrong}`}>
                {item.value}
              </p>
              <p className={`mt-1 text-[11px] font-medium ${ex.muted}`}>{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Party-centric portfolio — stacks on mobile, 2-col on lg+ */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <PartyFinanceCard
          party="SCL"
          contract={sclContractValue}
          invoicing={pmcInvoicing}
          contractLoading={isLoadingContractValues}
          invoicingLoading={isLoadingInvoicing}
          contractError={sclContractError}
          invoicingError={pmcInvoicingError}
          contractSectionId="exec-section-contract-values"
          invoicingSectionId="exec-section-invoicing"
        />
        <PartyFinanceCard
          party="Contractor"
          partyLabel={
            selectedContractorViewId == null
              ? 'All Contractors'
              : contractorDisplayName?.trim() || 'Contractor'
          }
          contract={contractorContractValue}
          invoicing={contractorInvoicing}
          contractLoading={isLoadingContractValues}
          invoicingLoading={isLoadingInvoicing}
          contractError={contractorContractError}
          invoicingError={contractorInvoicingError}
        />
      </div>

      <p className="flex items-center gap-2 text-center text-[11px] font-medium text-slate-500 sm:text-xs">
        <TrendingUp size={14} className="shrink-0 text-slate-400" />
        Executive read-only view · same underlying data as Team Lead financial modules
      </p>
    </div>
  );
};

export default PMCHeadMoneySection;
