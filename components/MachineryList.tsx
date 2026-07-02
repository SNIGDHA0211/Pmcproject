import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Icons } from './Icons';
import { useTheme, getThemeClasses } from '../utils/theme';
import { Project, MachineryMaster } from '../types';
import {
  plantMachineryApi,
  machineryMasterApi,
  normalizeMachineryMaster,
  normalizeMachineryMasterList,
  getApiErrorMessage,
  type MachineryMasterCreatePayload,
} from '../services/api';
import { Joyride, Step, STATUS, ACTIONS, EVENTS, EventData } from 'react-joyride';
import AddMachineryModal from './plantMachinery/AddMachineryModal';
import MachineryCategoryChips, {
  matchesMachineryCategoryFilter,
  type MachineryCategoryFilter,
} from './plantMachinery/MachineryCategoryChips';
import MachineryInlineRemark from './plantMachinery/MachineryInlineRemark';
import MachineryKpiCards from './plantMachinery/MachineryKpiCards';
import MachineryQtyStepper from './plantMachinery/MachineryQtyStepper';
import MachinerySearchSelector from './plantMachinery/MachinerySearchSelector';
import MachineryStickySubmitBar from './plantMachinery/MachineryStickySubmitBar';
import { toLocalDateIso, formatIsoDateLabel } from '../utils/format';
import { dispatchPlantMachineryUpdated } from '../utils/machineryDashboard';

interface MachineryItem {
  masterId?: string | number;
  srNo: number;
  particular: string;
  unit: string;
  category: string;
  qty: string;
  remark: string;
}

interface MachineryListProps {
  projects: Project[];
}

function buildTableRows(
  masters: MachineryMaster[],
  previous: MachineryItem[] = []
): MachineryItem[] {
  const previousById = new Map(
    previous.filter((row) => row.masterId != null).map((row) => [String(row.masterId), row])
  );
  const previousByName = new Map(
    previous.map((row) => [row.particular.trim().toLowerCase(), row])
  );

  return masters.map((master, index) => {
    const prev =
      previousById.get(String(master.id)) ??
      previousByName.get(master.name.trim().toLowerCase());
    return {
      masterId: master.id,
      srNo: index + 1,
      particular: master.name,
      unit: master.unit,
      category: master.category,
      qty: prev?.qty ?? '0',
      remark: prev?.remark ?? '',
    };
  });
}

function extractReportList(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  const payload = data as Record<string, unknown>;
  if (Array.isArray(payload.results)) return payload.results as Record<string, unknown>[];
  if (Array.isArray(payload.data)) return payload.data as Record<string, unknown>[];
  return [];
}

function mapReportItemsToPrevious(items: Record<string, unknown>[]): MachineryItem[] {
  return items.map((item, index) => {
    const rawMasterId =
      item.machinery_master ??
      item.machinery_master_id ??
      item.master_id ??
      item.masterId;
    return {
      masterId:
        rawMasterId !== undefined && rawMasterId !== null ? (rawMasterId as string | number) : undefined,
      srNo: Number(item.sr_no ?? item.srNo ?? index + 1),
      particular: String(item.particular ?? ''),
      unit: String(item.unit || 'No'),
      category: String(item.category ?? ''),
      qty: String(item.qty ?? 0),
      remark: String(item.remark ?? ''),
    };
  });
}

const MachineryList: React.FC<MachineryListProps> = ({ projects }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [reportDate, setReportDate] = useState(toLocalDateIso());
  const [machineryMaster, setMachineryMaster] = useState<MachineryMaster[]>([]);
  const [machineryData, setMachineryData] = useState<MachineryItem[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [selectedMachineryId, setSelectedMachineryId] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialName, setAddModalInitialName] = useState('');
  const [isSavingMachinery, setIsSavingMachinery] = useState(false);
  const [addMachineryError, setAddMachineryError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<'idle' | 'loaded' | 'empty' | 'error'>('idle');
  const [reportLoadError, setReportLoadError] = useState<string | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<MachineryCategoryFilter>('All');
  const [expandedRemarkSrNo, setExpandedRemarkSrNo] = useState<number | null>(null);

  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourActive, setTourActive] = useState(false);
  const [showStepRecoveryBanner, setShowStepRecoveryBanner] = useState(false);

  const loadMachineryMaster = useCallback(async () => {
    setIsLoadingMaster(true);
    setMasterError(null);
    try {
      const response = await machineryMasterApi.getAll();
      const masters = normalizeMachineryMasterList(response.data);
      setMachineryMaster(masters);
    } catch (error) {
      console.error('Failed to load machinery master:', error);
      setMasterError(getApiErrorMessage(error, 'Unable to load machinery list.'));
      setMachineryMaster([]);
      setMachineryData([]);
    } finally {
      setIsLoadingMaster(false);
    }
  }, []);

  const loadReportForDate = useCallback(async () => {
    if (machineryMaster.length === 0) {
      setMachineryData([]);
      setReportStatus('idle');
      return;
    }

    if (!selectedProjectId || !reportDate) {
      setMachineryData(buildTableRows(machineryMaster, []));
      setReportStatus('idle');
      setReportLoadError(null);
      setCurrentReportId(null);
      return;
    }

    const selectedProject = projects.find((p) => p.id === selectedProjectId);
    const projectName = selectedProject?.title || selectedProjectId;

    setIsLoadingReport(true);
    setReportLoadError(null);

    try {
      const response = await plantMachineryApi.getReports({
        project_name: projectName,
        report_date: reportDate,
        ordering: '-created_at',
      });

      const reports = extractReportList(response.data);
      if (reports.length > 0) {
        const report = reports[0];
        const items = (report.machinery_items ?? report.items ?? []) as Record<string, unknown>[];
        const previous = mapReportItemsToPrevious(items);
        setMachineryData(buildTableRows(machineryMaster, previous));
        setCurrentReportId((report.id ?? report.pk ?? null) as string | number | null);
        setReportStatus('loaded');
      } else {
        setMachineryData(buildTableRows(machineryMaster, []));
        setCurrentReportId(null);
        setReportStatus('empty');
      }
    } catch (error) {
      console.error('Failed to load machinery report for date:', error);
      setMachineryData(buildTableRows(machineryMaster, []));
      setReportStatus('error');
      setReportLoadError(getApiErrorMessage(error, 'Unable to load report for this date.'));
    } finally {
      setIsLoadingReport(false);
    }
  }, [machineryMaster, selectedProjectId, reportDate, projects]);

  useEffect(() => {
    loadMachineryMaster();
  }, [loadMachineryMaster]);

  useEffect(() => {
    loadReportForDate();
  }, [loadReportForDate]);

  const displayedRows = useMemo(() => {
    let rows = machineryData;
    if (categoryFilter !== 'All') {
      rows = rows.filter((row) => matchesMachineryCategoryFilter(row.category, categoryFilter));
    }
    if (selectedMachineryId) {
      rows = rows.filter((row) => String(row.masterId) === selectedMachineryId);
    }
    return rows;
  }, [machineryData, selectedMachineryId, categoryFilter]);

  const kpiStats = useMemo(() => {
    const categories = new Set(
      machineryData.map((row) => row.category.trim()).filter(Boolean)
    );
    let activeMachinery = 0;
    let totalQuantity = 0;
    for (const row of machineryData) {
      const qty = parseInt(row.qty, 10) || 0;
      if (qty > 0) activeMachinery += 1;
      totalQuantity += qty;
    }
    return {
      totalMachinery: machineryData.length,
      activeMachinery,
      totalQuantity,
      categoriesUsed: categories.size,
    };
  }, [machineryData]);

  const liveSummary = useMemo(() => {
    let selectedQuantity = 0;
    let machineryUpdated = 0;
    for (const row of machineryData) {
      const qty = parseInt(row.qty, 10) || 0;
      const hasRemark = Boolean(row.remark?.trim());
      selectedQuantity += qty;
      if (qty > 0 || hasRemark) machineryUpdated += 1;
    }
    return { selectedQuantity, machineryUpdated };
  }, [machineryData]);

  const handleQtyChange = (srNo: number, value: string) => {
    setMachineryData((prev) =>
      prev.map((item) => (item.srNo === srNo ? { ...item, qty: value } : item))
    );
  };

  const handleRemarkChange = (srNo: number, value: string) => {
    setMachineryData((prev) =>
      prev.map((item) => (item.srNo === srNo ? { ...item, remark: value } : item))
    );
  };

  const openAddMachineryModal = (initialName = '') => {
    setAddModalInitialName(initialName);
    setAddMachineryError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveMachinery = async (values: MachineryMasterCreatePayload): Promise<boolean> => {
    setIsSavingMachinery(true);
    setAddMachineryError(null);
    try {
      const response = await machineryMasterApi.create(values);
      const created =
        normalizeMachineryMaster(response.data?.data ?? response.data) ??
        ({
          id: `local-${Date.now()}`,
          name: values.name,
          unit: values.unit,
          category: values.category,
        } satisfies MachineryMaster);

      setMachineryMaster((prev) => {
        const exists = prev.some(
          (item) =>
            String(item.id) === String(created.id) ||
            item.name.toLowerCase() === created.name.toLowerCase()
        );
        const next = exists ? prev : [...prev, created];
        setMachineryData((rows) => buildTableRows(next, rows));
        return next;
      });

      setSelectedMachineryId(String(created.id));
      return true;
    } catch (error) {
      console.error('Failed to create machinery:', error);
      setAddMachineryError(getApiErrorMessage(error, 'Failed to save machinery.'));
      return false;
    } finally {
      setIsSavingMachinery(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProjectId) {
      alert('Please select a project first.');
      return;
    }

    const selectedProject = projects.find((p) => p.id === selectedProjectId);
    const projectName = selectedProject?.title || selectedProjectId;

    const itemsToSubmit = machineryData
      .filter((m) => parseInt(m.qty, 10) > 0 || (m.remark && m.remark.trim()))
      .map((m) => ({
        sr_no: m.srNo,
        particular: m.particular,
        unit: m.unit,
        qty: parseInt(m.qty, 10) || 0,
        remark: m.remark || '',
        status: 'Working' as const,
      }));

    if (itemsToSubmit.length === 0) {
      alert('Please enter quantity or remark for at least one item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        project_name: projectName,
        report_date: reportDate,
        created_by: 'Site Engineer',
        machinery_items: itemsToSubmit,
      };

      if (currentReportId !== null && currentReportId !== undefined) {
        await plantMachineryApi.patchReport(currentReportId, payload);
      } else {
        await plantMachineryApi.createReport(payload);
      }

      alert('Machinery report submitted successfully to the backend!');
      dispatchPlantMachineryUpdated();
      await loadReportForDate();
    } catch (error: unknown) {
      console.error('Failed to submit machinery data to API:', error);
      const axiosError = error as { response?: { data?: unknown }; message?: string };
      const msg = axiosError?.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError?.message || 'Unknown error';
      alert(`Failed to submit: ${msg}. Please check backend connection.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps: Step[] = useMemo(
    () => [
      {
        target: '.pm-header',
        title: 'Plant & Machinery',
        content:
          'This module is used to manage and monitor site plant machinery inventory and equipment deployment.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.project-select-field',
        title: 'Select Project',
        content: 'Select the active construction project for which machinery inventory is being updated.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.report-date-field',
        title: 'Report Date',
        content: 'This date determines the reporting period for machinery availability and deployment records.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.machinery-search-selector',
        title: 'Search Machinery',
        content: 'Search and select machinery from the master list, or add new machinery if it does not exist.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.table-header-tour',
        title: 'Table Header',
        content: 'The header row defines all columns for tracking machinery status and details.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.add-machinery-btn',
        title: 'Add Machinery',
        content: 'Create custom machinery types for your site inventory.',
        placement: 'left',
        disableBeacon: true,
      },
      {
        target: '.srno-column-tour',
        title: 'SR. NO',
        content: 'Displays serial number of machinery item',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.particular-column-tour',
        title: 'PARTICULAR',
        content: 'Shows machinery or equipment name',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.unit-column-tour',
        title: 'UNIT',
        content: 'Displays measurement unit',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.qty-column-tour',
        title: 'QTY.',
        content: 'Enter available machinery quantity here',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.remark-column-tour',
        title: 'REMARK',
        content: 'Add condition, maintenance, or availability remarks',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.actions-column-tour',
        title: 'ACTIONS',
        content: 'Used for future row actions and controls',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.pm-machinery-table',
        title: 'Machinery Inventory Table',
        content:
          'This table contains all registered site machinery and plant equipment available for the selected project. Scroll to view more rows.',
        placement: 'top',
        disableBeacon: true,
      },
      {
        target: '.submit-machinery-btn',
        title: 'Submit Quantity Selection',
        content: 'Submit the updated machinery quantity selections and remarks to save the site inventory report.',
        placement: 'top',
        disableBeacon: true,
      },
    ],
    []
  );

  const joyrideConfigOptions = useMemo(
    () => ({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1e293b',
      arrowColor: '#3b82f6',
      zIndex: 100010,
      showProgress: true,
      buttons: ['back', 'close', 'primary', 'skip'] as ['back', 'close', 'primary', 'skip'],
      spotlightPadding: 8,
      spotlightRadius: 12,
      blockTargetInteraction: false,
      overlayClickAction: false as false,
      skipScroll: false,
      disableBeacon: true,
      disableOverlayClose: true,
    }),
    []
  );

  const joyrideFloatingOptions = useMemo(
    () => ({
      strategy: 'fixed' as const,
      autoUpdate: {
        ancestorScroll: true,
        elementResize: true,
        animationFrame: true,
        layoutShift: true,
      },
      flipOptions: { padding: 12 },
      shiftOptions: { padding: 12 },
    }),
    []
  );

  const joyrideStyles = useMemo(
    () => ({
      tooltip: {
        borderRadius: '16px',
        padding: '16px 18px',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        maxWidth: 'min(360px, calc(100vw - 40px))',
        fontSize: '13px',
        lineHeight: '1.4',
      },
      tooltipTitle: {
        fontSize: '14px',
        fontWeight: 800,
        marginBottom: '4px',
      },
      tooltipContent: {
        fontSize: '12.5px',
      },
      buttonNext: {
        fontSize: '12px',
        padding: '6px 12px',
        backgroundColor: '#2563eb',
      },
      buttonBack: {
        fontSize: '12px',
      },
      buttonSkip: {
        fontSize: '11px',
      },
    }),
    []
  );

  const handleJoyrideEvent = useCallback(
    (data: EventData) => {
      const { action, index, status, type } = data;

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false);
        setStepIndex(0);
        setTourActive(false);
        setShowStepRecoveryBanner(false);
        localStorage.setItem('plantMachineryTourCompleted', 'true');
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        if (action === ACTIONS.NEXT) {
          const nextIndex = index + 1;
          if (nextIndex < steps.length) {
            const nextTarget = steps[nextIndex]?.target;
            if (typeof nextTarget === 'string') {
              setTimeout(() => {
                const el = document.querySelector(nextTarget);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                }
              }, 80);
            }
            setStepIndex(nextIndex);
          } else {
            setRun(false);
          }
          setShowStepRecoveryBanner(false);
        } else if (action === ACTIONS.PREV) {
          setStepIndex(Math.max(0, index - 1));
          setShowStepRecoveryBanner(false);
        }
      }

      if (type === EVENTS.TARGET_NOT_FOUND) {
        setShowStepRecoveryBanner(true);
      }
    },
    [steps.length]
  );

  const startTour = () => {
    localStorage.removeItem('plantMachineryTourCompleted');
    setStepIndex(0);
    setTourActive(true);
    setShowStepRecoveryBanner(false);
    setRun(false);
    setTimeout(() => setRun(true), 350);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-4 p-4 pb-24 md:p-6 md:pb-28">
      <Joyride
        key={run ? 'running' : 'stopped'}
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        scrollToFirstStep
        onEvent={handleJoyrideEvent}
        styles={joyrideStyles}
        options={joyrideConfigOptions}
        floatingOptions={joyrideFloatingOptions}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip',
        }}
      />

      <div className="relative z-[110] flex flex-wrap items-start justify-between gap-4">
        <div className="pm-header min-w-0">
          <h2 className={`text-3xl font-black ${themeClasses.textPrimary} uppercase tracking-tighter`}>
            Plant & Machinery
          </h2>
          <p className={`${themeClasses.textSecondary} font-bold text-xs tracking-widest uppercase mt-1`}>
            Site Asset Inventory Management
          </p>
        </div>
        <div className="pm-header-actions flex flex-wrap items-end justify-end gap-3">
          <div className="project-select-field pm-project-selector min-w-[200px] flex-1 sm:min-w-[220px]">
            <label className={`block text-sm font-semibold mb-2 ${themeClasses.textSecondary}`}>
              SELECT PROJECT
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className={`w-full border rounded-xl px-4 py-3 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="report-date-field pm-report-date">
            <label className={`block text-sm font-semibold mb-2 ${themeClasses.textSecondary}`}>
              REPORT DATE
            </label>
            <input
              type="date"
              value={reportDate}
              max={toLocalDateIso()}
              onChange={(e) => setReportDate(e.target.value)}
              className={`border rounded-xl px-4 py-3 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
            />
          </div>

          <button
            type="button"
            onClick={startTour}
            disabled={run}
            className="pm-start-tour-btn inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700"
          >
            <Icons.Help size={14} />
            {run ? 'Tour Running…' : 'Module Tour'}
          </button>
        </div>
      </div>

      {!isLoadingMaster && machineryData.length > 0 && (
        <MachineryKpiCards
          totalMachinery={kpiStats.totalMachinery}
          activeMachinery={kpiStats.activeMachinery}
          totalQuantity={kpiStats.totalQuantity}
          categoriesUsed={kpiStats.categoriesUsed}
        />
      )}

      <div
        className={`${themeClasses.glassCard} ${themeClasses.border} pm-machinery-table overflow-hidden rounded-2xl shadow-xl`}
      >
        <div className={`space-y-3 border-b p-4 ${themeClasses.border} ${themeClasses.bgSecondary}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className={`text-sm font-black ${themeClasses.textPrimary} uppercase tracking-widest`}>
              LIST OF RMC PLANT & SITE MACHINARY
            </h3>
            {selectedMachineryId && (
              <button
                type="button"
                onClick={() => setSelectedMachineryId('')}
                className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary} hover:text-indigo-600`}
              >
                Show all machinery
              </button>
            )}
          </div>
          <div className="machinery-search-selector flex flex-wrap items-center gap-3">
            <MachinerySearchSelector
              options={machineryMaster}
              value={selectedMachineryId}
              onChange={setSelectedMachineryId}
              onAddNew={(term) => openAddMachineryModal(term)}
            />
          </div>
          <MachineryCategoryChips value={categoryFilter} onChange={setCategoryFilter} />
          {masterError && (
            <p className="text-sm font-bold text-rose-500">
              {masterError}{' '}
              <button type="button" onClick={loadMachineryMaster} className="underline">
                Retry
              </button>
            </p>
          )}
          {selectedProjectId && reportDate && !isLoadingMaster && (
            <div
              className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${
                reportStatus === 'loaded'
                  ? isDarkTheme
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : reportStatus === 'empty'
                    ? isDarkTheme
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                    : reportStatus === 'error'
                      ? isDarkTheme
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                      : isDarkTheme
                        ? 'border-white/10 bg-white/5 text-slate-400'
                        : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              {isLoadingReport ? (
                <span className="inline-flex items-center gap-2">
                  <Icons.History className="animate-spin" size={14} />
                  Loading report for {formatIsoDateLabel(reportDate)}…
                </span>
              ) : reportStatus === 'loaded' ? (
                <>Showing saved report for {formatIsoDateLabel(reportDate)}. You can edit and re-submit.</>
              ) : reportStatus === 'empty' ? (
                <>No report saved for {formatIsoDateLabel(reportDate)}. Enter quantities below to create one.</>
              ) : reportStatus === 'error' ? (
                <>
                  {reportLoadError || 'Unable to load report for this date.'}{' '}
                  <button type="button" onClick={loadReportForDate} className="underline">
                    Retry
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`table-header-tour border-b ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                <th
                  className={`srno-column-tour w-12 px-3 py-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                >
                  #
                </th>
                <th
                  className={`particular-column-tour px-3 py-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                >
                  Machine
                </th>
                <th
                  className={`qty-column-tour w-28 px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                >
                  Qty
                </th>
                <th
                  className={`remark-column-tour w-[7.5rem] max-w-[7.5rem] px-2 py-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                >
                  Remark
                </th>
                <th
                  className={`actions-column-tour w-32 px-3 py-2 text-right text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                >
                  <button
                    type="button"
                    onClick={() => openAddMachineryModal()}
                    className={`add-machinery-btn inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:scale-[1.02] ${themeClasses.buttonPrimary}`}
                  >
                    <Icons.Add size={11} />
                    Add
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoadingMaster || isLoadingReport ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center">
                    <div className={`inline-flex items-center gap-2 text-sm font-bold ${themeClasses.textMuted}`}>
                      <Icons.History className="animate-spin" size={18} />
                      Loading {isLoadingMaster ? 'machinery list' : 'report for selected date'}...
                    </div>
                  </td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center">
                    <p className={`text-sm font-bold ${themeClasses.textMuted}`}>
                      No machinery found for this filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => openAddMachineryModal()}
                      className={`mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white ${themeClasses.buttonPrimary}`}
                    >
                      <Icons.Add size={12} />
                      Add New Machinery
                    </button>
                  </td>
                </tr>
              ) : (
                displayedRows.map((item) => (
                  <tr
                    key={item.masterId ?? item.srNo}
                    className={`transition-colors ${isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                  >
                    <td className={`px-3 py-2 text-[11px] font-bold tabular-nums ${themeClasses.textMuted}`}>
                      {item.srNo}
                    </td>
                    <td className="px-3 py-2">
                      <p className={`particular-column-tour text-xs font-bold leading-tight ${themeClasses.textPrimary}`}>
                        {item.particular}
                      </p>
                      <p
                        className={`unit-column-tour text-[10px] font-medium leading-tight ${themeClasses.textMuted}`}
                      >
                        {item.category}
                        {item.unit ? ` · ${item.unit}` : ''}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <MachineryQtyStepper
                        value={item.qty}
                        onChange={(value) => handleQtyChange(item.srNo, value)}
                      />
                    </td>
                    <td className="w-[7.5rem] max-w-[7.5rem] px-2 py-2">
                      <MachineryInlineRemark
                        remark={item.remark}
                        expanded={expandedRemarkSrNo === item.srNo}
                        onExpand={() => setExpandedRemarkSrNo(item.srNo)}
                        onCollapse={() => setExpandedRemarkSrNo(null)}
                        onChange={(value) => handleRemarkChange(item.srNo, value)}
                      />
                    </td>
                    <td className="px-3 py-2" aria-hidden />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MachineryStickySubmitBar
        selectedQuantity={liveSummary.selectedQuantity}
        machineryUpdated={liveSummary.machineryUpdated}
        isSubmitting={isSubmitting}
        disabled={isLoadingMaster || isLoadingReport}
        onSubmit={handleSubmit}
      />

      <AddMachineryModal
        open={isAddModalOpen}
        isSaving={isSavingMachinery}
        error={addMachineryError}
        initialName={addModalInitialName}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveMachinery}
      />

      {showStepRecoveryBanner && (
        <div
          className="fixed bottom-[calc(5.5rem+24px)] left-1/2 z-[105] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-indigo-200 bg-white/95 px-6 py-3 text-sm font-bold text-slate-800 shadow-2xl md:bottom-[calc(5rem+24px)]"
        >
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            Waiting for next element...
          </div>
          <button
            onClick={() => {
              setShowStepRecoveryBanner(false);
              setStepIndex((s) => s);
            }}
            className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      )}

      <style>{`
        .react-joyride__beacon,
        [data-test-id='button-beacon'] {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default MachineryList;
