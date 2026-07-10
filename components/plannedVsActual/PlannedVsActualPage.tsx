import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { Project } from '../../types';
import type { ContractorMasterRecord } from '../../types/contractorManagement';
import type {
  PvaCreatePayload,
  PvaDashboardKpis,
  PvaExportFormat,
  PvaProjectBundle,
  PvaRecord,
  PvaTrendPoint,
} from '../../types/plannedVsActual';
import { contractorMasterApi, fetchContractorManagementBundle } from '../../services/contractorManagementApi';
import {
  getApiErrorMessage,
  getPvaApiErrorMessage,
  plannedVsActualApi,
} from '../../services/plannedVsActualApi';
import { MONTH_OPTIONS, buildHealthSafetyYearOptions } from '../../utils/healthSafety';
import { getThemeClasses, useTheme } from '../../utils/theme';
import PvaDashboardKpisPanel from './PvaDashboardKpis';
import PvaPartyCard from './PvaPartyCard';
import PvaCharts from './PvaCharts';
import PvaRecordsTable from './PvaRecordsTable';
import PvaForms from './PvaForms';

interface PlannedVsActualPageProps {
  projects: Project[];
  initialProjectId?: string | null;
  /** Sync with Financial Management toolbar when embedded. */
  initialMonth?: number;
  initialYear?: number;
  /** Hide duplicate project/month/year filters (parent FM already has them). */
  embedInFinancialManagement?: boolean;
}

const CUMULATIVE = 'cumulative';

const PlannedVsActualPage: React.FC<PlannedVsActualPageProps> = ({
  projects,
  initialProjectId = null,
  initialMonth,
  initialYear,
  embedInFinancialManagement = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const now = new Date();
  const [projectId, setProjectId] = useState(
    () => initialProjectId || projects[0]?.id || '',
  );
  const [month, setMonth] = useState(() => initialMonth || now.getMonth() + 1);
  const [year, setYear] = useState(() => initialYear || now.getFullYear());
  const [contractorKey, setContractorKey] = useState<string>(CUMULATIVE);

  const [contractors, setContractors] = useState<ContractorMasterRecord[]>([]);
  const [contractorsError, setContractorsError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<PvaDashboardKpis | null>(null);
  const [bundle, setBundle] = useState<PvaProjectBundle | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<PvaRecord | null>(null);
  const [trend, setTrend] = useState<PvaTrendPoint[]>([]);
  const [tableRows, setTableRows] = useState<PvaRecord[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSelected, setIsLoadingSelected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );
  const projectName = selectedProject?.title ?? '';

  const yearOptions = useMemo(() => buildHealthSafetyYearOptions(), []);

  // Keep project selection in sync when parent FM project / project list loads
  useEffect(() => {
    if (initialProjectId && projects.some((p) => p.id === initialProjectId)) {
      setProjectId(initialProjectId);
      return;
    }
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [initialProjectId, projects, projectId]);

  // Keep month/year in sync with Financial Management toolbar
  useEffect(() => {
    if (initialMonth != null && initialMonth >= 1 && initialMonth <= 12) {
      setMonth(initialMonth);
    }
  }, [initialMonth]);

  useEffect(() => {
    if (initialYear != null && initialYear > 2000) {
      setYear(initialYear);
    }
  }, [initialYear]);

  const mergeContractorOptions = useCallback(
    (
      masters: ContractorMasterRecord[],
      pvaContractors: PvaRecord[] = [],
    ): ContractorMasterRecord[] => {
      const byId = new Map<number, ContractorMasterRecord>();
      for (const row of masters) {
        if (row?.id) byId.set(row.id, row);
      }
      for (const row of pvaContractors) {
        const id = row.contractorId != null ? Number(row.contractorId) : NaN;
        const name = String(row.contractorName ?? '').trim();
        if (!Number.isFinite(id) || id <= 0 || !name || byId.has(id)) continue;
        byId.set(id, {
          id,
          project_name: projectName,
          contractor_name: name,
          status: 'ACTIVE',
          contractor: { id, contractor_name: name },
        });
      }
      return [...byId.values()].sort((a, b) =>
        a.contractor_name.localeCompare(b.contractor_name),
      );
    },
    [projectName],
  );

  const loadCore = useCallback(async () => {
    if (!projectName) {
      setBundle(null);
      setTrend([]);
      setTableRows([]);
      setContractors([]);
      setContractorsError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setDashboardError(null);
    setContractorsError(null);

    const [dashboardResult, projectResult, trendResult, listResult, contractorsResult] =
      await Promise.allSettled([
        plannedVsActualApi.getDashboard({ month, year }),
        plannedVsActualApi.getByProject(projectName, { month, year }),
        plannedVsActualApi.getTrend(projectName, { year }),
        plannedVsActualApi.list({ project_name: projectName, month, year, page_size: 200 }),
        // Prefer full contractor management bundle (master + dashboard fallbacks)
        fetchContractorManagementBundle(projectName).catch(async () => {
          const list = await contractorMasterApi.list(projectName);
          return { masters: list, contractValues: null, invoicing: null, projectDates: null };
        }),
      ]);

    if (dashboardResult.status === 'fulfilled') {
      setDashboard(dashboardResult.value);
      setDashboardError(null);
    } else {
      setDashboard(null);
      const status = (dashboardResult.reason as { response?: { status?: number } })?.response
        ?.status;
      // Missing dashboard endpoint / empty portfolio is not a hard page error
      if (status === 404) {
        setDashboardError(null);
      } else {
        setDashboardError(
          getApiErrorMessage(dashboardResult.reason, 'Unable to load Planned vs Actual dashboard'),
        );
      }
    }

    let projectBundle: PvaProjectBundle | null = null;
    if (projectResult.status === 'fulfilled') {
      projectBundle = projectResult.value;
      setBundle(projectResult.value);
    } else {
      setBundle(null);
      setError(
        getApiErrorMessage(projectResult.reason, 'Unable to load Planned vs Actual project data'),
      );
    }

    if (trendResult.status === 'fulfilled') {
      setTrend(trendResult.value.points);
    } else {
      setTrend([]);
    }

    if (listResult.status === 'fulfilled') {
      setTableRows(listResult.value);
    } else if (projectBundle) {
      const fallback: PvaRecord[] = [];
      if (projectBundle.scl) fallback.push(projectBundle.scl);
      if (projectBundle.contractorSummary) fallback.push(projectBundle.contractorSummary);
      fallback.push(...projectBundle.contractors);
      setTableRows(fallback);
    } else {
      setTableRows([]);
    }

    if (contractorsResult.status === 'fulfilled') {
      const masters = contractorsResult.value.masters ?? [];
      setContractors(mergeContractorOptions(masters, projectBundle?.contractors ?? []));
      if (masters.length === 0 && (projectBundle?.contractors?.length ?? 0) === 0) {
        setContractorsError(
          'No contractors found for this project. Add them in Contractor Management first.',
        );
      }
    } else {
      // Still try PVA bundle contractors so the form is usable
      const fromPva = mergeContractorOptions([], projectBundle?.contractors ?? []);
      setContractors(fromPva);
      setContractorsError(
        fromPva.length
          ? null
          : getApiErrorMessage(
              contractorsResult.reason,
              'Unable to load contractors for this project',
            ),
      );
    }

    setIsLoading(false);
  }, [projectName, month, year, mergeContractorOptions]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    setFormError(null);
    setFormSuccess(null);
  }, [projectName, month, year]);

  useEffect(() => {
    let cancelled = false;

    const loadSelected = async () => {
      if (!projectName || contractorKey === CUMULATIVE) {
        setSelectedContractor(null);
        setSelectedError(null);
        return;
      }

      const contractorId = Number(contractorKey);
      if (!Number.isFinite(contractorId)) return;

      setIsLoadingSelected(true);
      setSelectedError(null);
      try {
        // Prefer in-memory bundle row first (avoids noisy 404s)
        const fromBundle =
          bundle?.contractors.find((row) => Number(row.contractorId) === contractorId) ?? null;
        if (fromBundle) {
          if (!cancelled) {
            setSelectedContractor(fromBundle);
            setSelectedError(null);
          }
          return;
        }

        const record = await plannedVsActualApi.getContractor(projectName, {
          contractor_id: contractorId,
          month,
          year,
        });
        if (!cancelled) {
          setSelectedContractor(record);
          setSelectedError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSelectedContractor(null);
          const status = (err as { response?: { status?: number } })?.response?.status;
          const message = getApiErrorMessage(err, '').toLowerCase();
          // No record yet → empty state, not a red error
          if (status === 404 || message.includes('not found')) {
            setSelectedError(null);
          } else {
            setSelectedError(
              getApiErrorMessage(err, 'Unable to load selected contractor Planned vs Actual'),
            );
          }
        }
      } finally {
        if (!cancelled) setIsLoadingSelected(false);
      }
    };

    void loadSelected();
    return () => {
      cancelled = true;
    };
  }, [projectName, contractorKey, month, year, bundle?.contractors]);

  const handleSave = async (
    payload: PvaCreatePayload,
    existingId?: string | number | null,
  ) => {
    setFormError(null);
    setFormSuccess(null);
    try {
      const knownRecords: PvaRecord[] = [
        ...tableRows,
        ...(bundle?.scl ? [bundle.scl] : []),
        ...(bundle?.contractors ?? []),
        ...(selectedContractor ? [selectedContractor] : []),
      ];

      const { record: saved, action } = await plannedVsActualApi.save(payload, {
        existingId,
        knownRecords,
      });

      // Refresh cards/table only — forms keep their own isolated state
      await loadCore();

      if (payload.planned_type === 'CONTRACTOR' && payload.contractor_id) {
        setContractorKey(String(payload.contractor_id));
        if (saved) {
          setSelectedContractor({
            ...saved,
            partyType: 'CONTRACTOR',
            contractorId: saved.contractorId ?? payload.contractor_id,
            contractorName: saved.contractorName ?? payload.contractor_name ?? null,
            month: saved.month || payload.month,
            year: saved.year || payload.year,
          });
        }
      }

      setFormSuccess(
        payload.planned_type === 'SCL'
          ? action === 'updated'
            ? 'SCL record updated.'
            : 'SCL record created.'
          : action === 'updated'
            ? 'Contractor record updated.'
            : 'Contractor record created.',
      );
      return { record: saved, action };
    } catch (err) {
      const message = getPvaApiErrorMessage(err, 'Failed to save Planned vs Actual record');
      setFormError(message);
      throw err;
    }
  };

  const handleExport = async (format: PvaExportFormat) => {
    setIsExporting(true);
    try {
      await plannedVsActualApi.export(format, {
        project_name: projectName || undefined,
        month,
        year,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Export failed'));
    } finally {
      setIsExporting(false);
    }
  };

  const activeContractors = useMemo(
    () =>
      contractors.filter((c) => {
        const status = String(c.status ?? 'ACTIVE').toUpperCase();
        return status !== 'INACTIVE';
      }),
    [contractors],
  );

  const selectClass = `h-11 rounded-lg border px-3 text-sm font-medium outline-none ${themeClasses.input} ${themeClasses.border}`;
  const selectedContractorName =
    activeContractors.find((c) => String(c.id) === contractorKey)?.contractor_name ||
    selectedContractor?.contractorName ||
    'Selected contractor';

  return (
    <div className="space-y-4">
      <div
        className={`flex flex-wrap items-center gap-2 rounded-2xl border p-3 sm:gap-3 sm:px-4 ${
          isDarkTheme
            ? `${themeClasses.glassCard} ${themeClasses.border}`
            : 'border-slate-200 bg-white shadow-sm'
        }`}
      >
        {!embedInFinancialManagement && (
          <>
            <select
              className={`${selectClass} min-w-[160px] flex-1 sm:max-w-[220px]`}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setContractorKey(CUMULATIVE);
              }}
              aria-label="Project"
            >
              <option value="">Project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <select
              className={`${selectClass} w-[120px]`}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              aria-label="Month"
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              className={`${selectClass} w-[100px]`}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="Year"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </>
        )}

        {embedInFinancialManagement && (
          <p className={`text-xs font-semibold ${themeClasses.textMuted}`}>
            Using project/period from Financial Management toolbar · {projectName || '—'} ·{' '}
            {MONTH_OPTIONS.find((m) => m.value === month)?.label ?? month} {year}
          </p>
        )}

        <select
          className={`${selectClass} min-w-[180px] flex-1 sm:max-w-[240px]`}
          value={contractorKey}
          onChange={(e) => setContractorKey(e.target.value)}
          aria-label="Contractor"
        >
          <option value={CUMULATIVE}>Cumulative (All Contractors)</option>
          {activeContractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.contractor_name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void loadCore()}
          disabled={isLoading}
          className={`inline-flex h-11 items-center gap-2 rounded-lg border px-3 text-xs font-bold uppercase ${
            isDarkTheme
              ? 'border-white/15 bg-white/5 text-slate-200'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <PvaDashboardKpisPanel
        data={dashboard}
        isLoading={isLoading}
        error={dashboardError}
      />

      <div className="space-y-3">
        <PvaPartyCard
          title="SCL Planned vs Actual"
          subtitle="Owner / SCL financial performance"
          data={bundle?.scl ?? null}
          isLoading={isLoading}
          emptyMessage="No SCL Planned vs Actual for this period. Use the SCL form below to add it."
        />

        <PvaPartyCard
          title="Contractor Summary (All Contractors)"
          subtitle="Cumulative values from backend"
          data={bundle?.contractorSummary ?? null}
          isLoading={isLoading}
          emptyMessage="No contractor summary yet. Save at least one contractor record for this period."
        />

        {contractorKey !== CUMULATIVE && (
          <PvaPartyCard
            title="Selected Contractor"
            subtitle={selectedContractorName}
            data={selectedContractor}
            isLoading={isLoadingSelected}
            error={selectedError}
            emptyMessage={`No Planned vs Actual saved for ${selectedContractorName} in this period. Use the Contractor form below to add it.`}
          />
        )}
      </div>

      <PvaCharts
        scl={bundle?.scl ?? null}
        contractorSummary={bundle?.contractorSummary ?? null}
        selectedContractor={contractorKey === CUMULATIVE ? null : selectedContractor}
        trend={trend}
        isLoadingTrend={isLoading}
      />

      <PvaRecordsTable
        rows={tableRows}
        isLoading={isLoading}
        onExport={(format) => void handleExport(format)}
        isExporting={isExporting}
      />

      <PvaForms
        projectName={projectName}
        month={month}
        year={year}
        contractors={activeContractors}
        selectedContractorId={contractorKey !== CUMULATIVE ? contractorKey : null}
        existingScl={bundle?.scl ?? null}
        existingContractors={[
          ...(bundle?.contractors ?? []),
          ...tableRows.filter((r) => r.contractorId != null),
          ...(selectedContractor?.contractorId != null ? [selectedContractor] : []),
        ].filter(
          (r, index, arr) =>
            String(r.partyType).toUpperCase() !== 'SCL' &&
            String(r.partyType).toUpperCase() !== 'CONTRACTOR_SUMMARY' &&
            r.contractorId != null &&
            arr.findIndex((x) => Number(x.contractorId) === Number(r.contractorId)) === index,
        )}
        onSubmit={handleSave}
        onContractorSelect={(id) => {
          if (id) setContractorKey(id);
        }}
        error={formError || contractorsError}
        success={formSuccess}
      />
    </div>
  );
};

export default PlannedVsActualPage;
