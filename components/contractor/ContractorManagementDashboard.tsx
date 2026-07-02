import React, { useMemo, useState } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  ArrowRight,
  Building2,
  Calendar,
  HardHat,
  Pencil,
  Plus,
  Shield,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Project } from '../../types';
import type {
  BgEntryApi,
  ContractorDashboardTab,
  ContractorMasterRecord,
  ProjectDatesApiRecord,
} from '../../types/contractorManagement';
import { useContractorManagementDashboard } from '../../hooks/useContractorManagementDashboard';
import { mapBgEntriesApi, filterContractorBgEntries } from '../../utils/contractorDashboardMappers';
import EnterpriseKpiCard from './EnterpriseKpiCard';
import AddContractorModal from './AddContractorModal';
import FinancialPortfolioPanels from './FinancialPortfolioPanels';
import ScheduleHorizontalTimeline from './ScheduleHorizontalTimeline';
import {
  CM_COLORS,
  formatApiCurrency,
  formatApiPercent,
  formatDisplayDate,
  useCmTheme,
} from './enterpriseTheme';
import {
  CmButton,
  CmContentContainer,
  CmDashboardHeader,
  CmInfoCard,
  CmLoadingSkeleton,
  CmSectionPanel,
  type CmTabItem,
} from './ui';

interface ContractorManagementDashboardProps {
  project: Project;
  dataRevision?: number;
  onNavigateFinancial?: (section: 'contracts' | 'invoicing') => void;
  onEditSclDates?: () => void;
  onEditContractorDates?: (record: ProjectDatesApiRecord) => void;
  onAddContractorSchedule?: () => void;
  onManageBg?: (scope: 'all' | 'SCL' | 'CONTRACTOR') => void;
  onContractorCreated?: (record: ContractorMasterRecord) => void;
}

const TABS: CmTabItem[] = [
  { id: 'overview', label: 'Overview', short: 'Overview' },
  { id: 'contract_values', label: 'Contract Values', short: 'Contracts' },
  { id: 'invoicing', label: 'Invoicing', short: 'Invoicing' },
  { id: 'project_dates', label: 'Project Dates', short: 'Schedule' },
  { id: 'bg_status', label: 'BG Status', short: 'BG' },
];

const OverviewDrillCard: React.FC<{
  icon: LucideIcon;
  title: string;
  metrics: { label: string; value: string }[];
  accent: string;
  borderAccent: string;
  onOpen: () => void;
}> = ({ icon: Icon, title, metrics, accent, borderAccent, onOpen }) => {
  const theme = useCmTheme();

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${theme.drillCard} group flex min-h-[120px] w-full flex-col border-t-[3px] ${borderAccent} p-4 text-left sm:min-h-[130px] sm:p-5`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
            <Icon size={18} />
          </span>
          <span className={theme.drillTitle}>{title}</span>
        </div>
        <span className={theme.drillArrow}>
          <ArrowRight size={15} />
        </span>
      </div>
      <div className="mt-4 grid flex-1 grid-cols-2 gap-2 sm:gap-3">
        {metrics.map((m) => (
          <div key={m.label} className={theme.metricBg}>
            <p className={theme.metricLabel}>{m.label}</p>
            <p className={theme.metricValue}>{m.value}</p>
          </div>
        ))}
      </div>
    </button>
  );
};

const ContractorManagementDashboard: React.FC<ContractorManagementDashboardProps> = ({
  project,
  dataRevision = 0,
  onEditSclDates,
  onEditContractorDates,
  onAddContractorSchedule,
  onManageBg,
  onContractorCreated,
  onNavigateFinancial,
}) => {
  const [activeTab, setActiveTab] = useState<ContractorDashboardTab>('overview');
  const [isAddContractorOpen, setIsAddContractorOpen] = useState(false);
  const theme = useCmTheme();
  const cm = useContractorManagementDashboard(project.title, dataRevision);

  const handleContractorCreated = (record: ContractorMasterRecord) => {
    cm.setSelectedContractorMasterId(record.id);
    void cm.refresh();
    onContractorCreated?.(record);
  };

  const delay =
    cm.selectedDatesRecord?.current_delay ?? cm.selectedDatesRecord?.delay_days ?? 0;

  const overviewKpis = useMemo(
    () => [
      { icon: Users, label: 'Contractors', value: String(cm.contractorCount), tone: 'primary' as const },
      {
        icon: Wallet,
        label: 'Revised Contract',
        value: formatApiCurrency(cm.contractValues?.contractor_summary.revised_value),
        tone: 'neutral' as const,
      },
      {
        icon: TrendingUp,
        label: 'Gross Billed',
        value: formatApiCurrency(cm.invoicing?.contractor_summary.gross_billed),
        tone: 'neutral' as const,
      },
      {
        icon: Building2,
        label: 'Cert. Efficiency',
        value: formatApiPercent(cm.invoicing?.contractor_summary.certification_efficiency),
        tone: 'success' as const,
      },
      {
        icon: Shield,
        label: 'BG Compliance',
        value: cm.projectDates?.bg_summary
          ? formatApiPercent(cm.projectDates.bg_summary.compliance_percentage)
          : '—',
        tone: 'warning' as const,
      },
      {
        icon: Calendar,
        label: 'Delay Days',
        value: String(Math.abs(Math.round(delay))),
        tone: delay > 0 ? ('error' as const) : ('success' as const),
      },
    ],
    [cm, delay],
  );

  const bgDonutData = useMemo(() => {
    const s = cm.projectDates?.bg_summary;
    if (!s) return [];
    return [
      { name: 'Updated', value: s.updated, color: CM_COLORS.success },
      { name: 'Pending', value: s.yet_to_update, color: CM_COLORS.warning },
      { name: 'Not updated', value: s.not_updated, color: CM_COLORS.error },
    ].filter((d) => d.value > 0);
  }, [cm.projectDates?.bg_summary]);

  const selectedCvRow = cm.selectedContractValuesRow;
  const selectedInvRow = cm.selectedInvoicingRow;

  const filteredContractorBg = useMemo(() => {
    const rows = cm.projectDates?.contractor_bg ?? [];
    if (!cm.selectedMaster) return rows;
    const name = cm.selectedMaster.contractor_name.trim().toLowerCase();
    return rows.filter((bg) => {
      const bgName = bg.contractor_name?.trim().toLowerCase();
      return !bgName || bgName === name;
    });
  }, [cm.projectDates?.contractor_bg, cm.selectedMaster]);

  if (cm.loading && !cm.contractValues && !cm.projectDates) {
    return (
      <div className={theme.root}>
        <CmLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className={`contractor-management-dashboard font-[Inter,system-ui,sans-serif] ${theme.root}`}>
      <CmDashboardHeader
        projectTitle={project.title}
        activeTab={activeTab}
        tabs={TABS}
        onTabChange={setActiveTab}
        contractors={cm.masters}
        selectedContractorId={cm.selectedContractorMasterId}
        onContractorChange={cm.setSelectedContractorMasterId}
        onAddContractor={() => setIsAddContractorOpen(true)}
        onRefresh={() => void cm.refresh()}
        loading={cm.loading}
        lastUpdated={cm.lastUpdated}
        error={cm.error}
      />

      {cm.selectedMaster && activeTab !== 'overview' && (
        <CmInfoCard
          icon={HardHat}
          title={cm.selectedMaster.contractor_name}
          subtitle="Viewing selected contractor across this section"
        />
      )}

      {activeTab === 'overview' && (
        <CmContentContainer tabId="overview">
          <div className="flex gap-2 overflow-x-auto pb-1 sm:gap-3">
            {overviewKpis.map((item) => (
              <EnterpriseKpiCard key={item.label} {...item} compact />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <OverviewDrillCard
              icon={Wallet}
              title="Contract Values"
              accent={theme.drillAccents.contract}
              borderAccent={theme.borderAccents.contract}
              onOpen={() => setActiveTab('contract_values')}
              metrics={[
                { label: 'Revised', value: formatApiCurrency(cm.contractValues?.contractor_summary.revised_value) },
                { label: 'Increase', value: formatApiPercent(cm.contractValues?.contractor_summary.increase_percentage) },
              ]}
            />
            <OverviewDrillCard
              icon={TrendingUp}
              title="Invoicing"
              accent={theme.drillAccents.invoicing}
              borderAccent={theme.borderAccents.invoicing}
              onOpen={() => setActiveTab('invoicing')}
              metrics={[
                { label: 'Billed', value: formatApiCurrency(cm.invoicing?.contractor_summary.gross_billed) },
                { label: 'Efficiency', value: formatApiPercent(cm.invoicing?.contractor_summary.certification_efficiency) },
              ]}
            />
            <OverviewDrillCard
              icon={Calendar}
              title="Project Dates"
              accent={theme.drillAccents.schedule}
              borderAccent={theme.borderAccents.schedule}
              onOpen={() => setActiveTab('project_dates')}
              metrics={[
                { label: 'Delay', value: `${Math.abs(Math.round(delay))} days` },
                { label: 'Remaining', value: `${cm.selectedDatesRecord?.remaining_duration ?? '—'} days` },
              ]}
            />
            <OverviewDrillCard
              icon={Shield}
              title="BG Status"
              accent={theme.drillAccents.bg}
              borderAccent={theme.borderAccents.bg}
              onOpen={() => setActiveTab('bg_status')}
              metrics={[
                { label: 'Compliance', value: formatApiPercent(cm.projectDates?.bg_summary?.compliance_percentage) },
                { label: 'Updated', value: `${cm.projectDates?.bg_summary?.updated ?? 0}/${cm.projectDates?.bg_summary?.total_bg ?? 0}` },
              ]}
            />
          </div>

          {cm.selectedMaster && (selectedCvRow || selectedInvRow || cm.selectedDatesRecord) && (
            <section className={theme.panel}>
              <div
                className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5 ${
                  theme.isDark ? 'border-b-white/10' : 'border-b-slate-100'
                } ${theme.moduleAccents.contract}`}
              >
                <h2 className={`text-base font-bold ${theme.tc.textPrimary}`}>
                  {cm.selectedMaster.contractor_name} — Quick Snapshot
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:gap-4 sm:p-5">
                {selectedCvRow && (
                  <>
                    <div className={theme.metricBg}>
                      <p className={theme.sectionTitle}>Revised Value</p>
                      <p className={`mt-1 text-base font-black tabular-nums ${theme.tc.textPrimary}`}>
                        {formatApiCurrency(selectedCvRow.contract_values.revised_value)}
                      </p>
                    </div>
                    <div className={theme.metricBg}>
                      <p className={theme.sectionTitle}>Increase</p>
                      <p className={`mt-1 text-base font-black tabular-nums ${theme.tc.textPrimary}`}>
                        {formatApiPercent(selectedCvRow.contract_values.increase_percentage)}
                      </p>
                    </div>
                  </>
                )}
                {selectedInvRow && (
                  <>
                    <div className={theme.metricBg}>
                      <p className={theme.sectionTitle}>Gross Billed</p>
                      <p className={`mt-1 text-base font-black tabular-nums ${theme.tc.textPrimary}`}>
                        {formatApiCurrency(selectedInvRow.invoicing.gross_billed)}
                      </p>
                    </div>
                    <div className={theme.metricBg}>
                      <p className={theme.sectionTitle}>Efficiency</p>
                      <p className={`mt-1 text-base font-black tabular-nums ${theme.isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {formatApiPercent(selectedInvRow.invoicing.certification_efficiency)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}
        </CmContentContainer>
      )}

      {activeTab === 'contract_values' && cm.contractValues && (
        <CmContentContainer tabId="contract_values">
          <FinancialPortfolioPanels
            mode="contract_values"
            contractValues={cm.contractValues}
            contractorDisplayName={cm.selectedMaster?.contractor_name}
            selectedContractorMasterId={cm.selectedContractorMasterId}
            onEditInFinancialManagement={
              onNavigateFinancial ? () => onNavigateFinancial('contracts') : undefined
            }
          />
        </CmContentContainer>
      )}

      {activeTab === 'invoicing' && cm.invoicing && (
        <CmContentContainer tabId="invoicing">
          <FinancialPortfolioPanels
            mode="invoicing"
            invoicing={cm.invoicing}
            contractorDisplayName={cm.selectedMaster?.contractor_name}
            selectedContractorMasterId={cm.selectedContractorMasterId}
            onEditInFinancialManagement={
              onNavigateFinancial ? () => onNavigateFinancial('invoicing') : undefined
            }
          />
        </CmContentContainer>
      )}

      {activeTab === 'project_dates' && cm.projectDates && (
        <CmContentContainer tabId="project_dates">
          <CmSectionPanel
            title="Project Schedule"
            subtitle="SCL → Contractors"
            accent="schedule"
            actions={
              <>
                {onEditSclDates && (
                  <CmButton variant="secondary" icon={Pencil} onClick={onEditSclDates}>
                    SCL
                  </CmButton>
                )}
                {onAddContractorSchedule && (
                  <CmButton variant="primary" icon={Plus} onClick={onAddContractorSchedule}>
                    Schedule
                  </CmButton>
                )}
              </>
            }
          >
            <div className="space-y-3 sm:space-y-4">
              {cm.projectDates.scl && (
                <ScheduleHorizontalTimeline
                  title="SCL Schedule"
                  record={cm.projectDates.scl}
                  variant="SCL"
                  bgEntries={mapBgEntriesApi(cm.projectDates.scl_bg ?? [])}
                  onEdit={onEditSclDates}
                  onManageBg={onManageBg ? () => onManageBg('SCL') : undefined}
                />
              )}
              {cm.projectDates.contractors.map((record: ProjectDatesApiRecord, index: number) => (
                <ScheduleHorizontalTimeline
                  key={record.id}
                  title={`${index + 1}. ${record.contractor_name ?? 'Contractor'}`}
                  record={record}
                  variant="Contractor"
                  bgEntries={filterContractorBgEntries(
                    cm.projectDates?.contractor_bg ?? [],
                    record.contractor_name,
                  )}
                  highlighted={record.contractor?.id === cm.selectedContractorMasterId}
                  onEdit={onEditContractorDates ? () => onEditContractorDates(record) : undefined}
                  onManageBg={onManageBg ? () => onManageBg('CONTRACTOR') : undefined}
                  onSelect={
                    record.contractor?.id
                      ? () => cm.setSelectedContractorMasterId(record.contractor!.id)
                      : undefined
                  }
                />
              ))}
            </div>
          </CmSectionPanel>
        </CmContentContainer>
      )}

      {activeTab === 'bg_status' && cm.projectDates && (
        <CmContentContainer tabId="bg_status">
          <CmSectionPanel
            title="Bank Guarantee Status"
            subtitle="SCL BG → Contractor BG → Summary"
            accent="bg"
            actions={
              onManageBg ? (
                <CmButton variant="primary" icon={Pencil} onClick={() => onManageBg('all')}>
                  Manage
                </CmButton>
              ) : undefined
            }
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
              <BgColumn
                title="SCL Bank Guarantees"
                emptyLabel="None on file"
                entries={cm.projectDates.scl_bg}
              />
              <BgColumn
                title={`Contractor BG${cm.selectedMaster ? ` · ${cm.selectedMaster.contractor_name}` : ''}`}
                emptyLabel="None on file"
                entries={filteredContractorBg}
              />
              {cm.projectDates.bg_summary && (
                <div className={`${theme.card} border-t-4 border-t-amber-500 p-4`}>
                  <p className={theme.sectionTitle}>BG Summary</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                    {[
                      ['Total', String(cm.projectDates.bg_summary.total_bg)],
                      ['Updated', String(cm.projectDates.bg_summary.updated)],
                      ['Pending', String(cm.projectDates.bg_summary.yet_to_update)],
                      ['Compliance', formatApiPercent(cm.projectDates.bg_summary.compliance_percentage)],
                    ].map(([label, val]) => (
                      <div key={label} className={theme.metricBg}>
                        <p className={theme.metricLabel}>{label}</p>
                        <p className={`text-base font-black tabular-nums ${theme.tc.textPrimary}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                  {bgDonutData.length > 0 && (
                    <div className="mx-auto mt-4 h-36 w-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={bgDonutData} dataKey="value" innerRadius={38} outerRadius={58} paddingAngle={3}>
                            {bgDonutData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={
                              theme.isDark
                                ? { background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }
                                : undefined
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CmSectionPanel>
        </CmContentContainer>
      )}

      {cm.contractorCount === 0 && !cm.loading && (
        <div className={`${theme.panel} p-6 text-center`}>
          <Users className={`mx-auto ${theme.emptyIcon}`} size={32} aria-hidden />
          <p className={`mt-2 ${theme.emptyTitle}`}>No contractors yet</p>
          <p className={`mt-0.5 ${theme.emptySubtitle}`}>Add a contractor to get started</p>
          <CmButton variant="primary" icon={Plus} onClick={() => setIsAddContractorOpen(true)} className="mt-4">
            Add Contractor
          </CmButton>
        </div>
      )}

      <AddContractorModal
        open={isAddContractorOpen}
        projectName={project.title}
        onClose={() => setIsAddContractorOpen(false)}
        onCreated={handleContractorCreated}
      />
    </div>
  );
};

const BgColumn: React.FC<{ title: string; emptyLabel: string; entries: BgEntryApi[] }> = ({
  title,
  emptyLabel,
  entries,
}) => {
  const theme = useCmTheme();

  return (
    <div>
      <p className={`mb-3 ${theme.sectionTitle}`}>{title}</p>
      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className={`text-xs ${theme.tc.textMuted}`}>{emptyLabel}</p>
        ) : (
          entries.map((entry) => <BgEntryCard key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
};

const BgEntryCard: React.FC<{ entry: BgEntryApi }> = ({ entry }) => {
  const theme = useCmTheme();
  const statusTone =
    entry.status === 'UPDATED'
      ? theme.bgStatus.updated
      : entry.status === 'NOT_UPDATED'
        ? theme.bgStatus.notUpdated
        : theme.bgStatus.pending;

  return (
    <div className={`${theme.card} p-3.5`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-bold leading-snug ${theme.tc.textPrimary}`}>{entry.bg_name}</p>
        <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone}`}>
          {entry.status.replace(/_/g, ' ')}
        </span>
      </div>
      <div className={`mt-3 grid grid-cols-2 gap-3 p-2.5 text-xs ${theme.metricBg}`}>
        <div>
          <p className={theme.metricLabel}>Due</p>
          <p className={`font-semibold ${theme.tc.textPrimary}`}>{formatDisplayDate(entry.due_date)}</p>
        </div>
        <div>
          <p className={theme.metricLabel}>Updated</p>
          <p className={`font-semibold ${theme.tc.textPrimary}`}>{formatDisplayDate(entry.updated_date)}</p>
        </div>
      </div>
    </div>
  );
};

export default ContractorManagementDashboard;
