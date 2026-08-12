import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { Project, User } from '../../types';
import type { MprPreviewSnapshot, MprReportRecord } from '../../types/mpr';
import {
  getMprApiErrorMessage,
  mprApi,
  openMprDownloadUrl,
} from '../../services/mprApi';
import {
  currentMprMonth,
  formatMprMonthLabel,
  isValidMprMonth,
  monthOptions,
  mprStatusLabel,
} from '../../utils/mprHelpers';
import { extractMprKpis } from '../../utils/mprPreview';
import { useMprTheme } from '../../utils/mprTheme';
import { sanitizeProjectDisplayName } from '../../utils/hseSiteEngineerProjects';
import MprHistoryPanel from './MprHistoryPanel';
import MprKpiStrip from './MprKpiStrip';
import MprPreviewPanel from './MprPreviewPanel';
import MprProjectSelect from './MprProjectSelect';

type ViewTab = 'preview' | 'history';

interface MPRReviewDashboardProps {
  projects?: Project[];
  currentUser?: User | null;
  selectedProjectId?: string | null;
}

const MPRReviewDashboard: React.FC<MPRReviewDashboardProps> = ({
  projects = [],
  currentUser = null,
  selectedProjectId = null,
}) => {
  const mpr = useMprTheme();

  const projectOptions = useMemo(
    () =>
      projects
        .map((p) => ({
          id: p.id,
          label: sanitizeProjectDisplayName(p.title || p.apiName || p.id),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [projects],
  );

  const [projectId, setProjectId] = useState(
    selectedProjectId || projectOptions[0]?.id || '',
  );
  const [month, setMonth] = useState(currentMprMonth());
  const [viewTab, setViewTab] = useState<ViewTab>('preview');

  const [preview, setPreview] = useState<MprPreviewSnapshot | null>(null);
  const [previewCache, setPreviewCache] = useState<string | undefined>();
  const [history, setHistory] = useState<MprReportRecord[]>([]);
  const [activeReport, setActiveReport] = useState<MprReportRecord | null>(null);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedProjectLabel =
    projectOptions.find((p) => p.id === projectId)?.label || '—';

  const reportForMonth = useMemo(() => {
    const matches = history.filter((r) => r.report_month === month);
    if (matches.length === 0) return null;
    return matches.find((r) => r.is_latest) ?? matches.sort((a, b) => b.version - a.version)[0];
  }, [history, month]);

  const kpis = useMemo(() => extractMprKpis(preview), [preview]);

  useEffect(() => {
    if (selectedProjectId) setProjectId(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!projectId && projectOptions.length > 0) {
      setProjectId(projectOptions[0].id);
    }
  }, [projectId, projectOptions]);

  useEffect(() => {
    setActiveReport(reportForMonth);
  }, [reportForMonth]);

  const loadHistory = useCallback(async () => {
    if (!projectId) return;
    setLoadingHistory(true);
    try {
      const result = await mprApi.listForProject(projectId, {
        latest_only: false,
        page_size: 100,
      });
      setHistory(result.results);
    } catch (err) {
      setError(getMprApiErrorMessage(err, 'Could not load MPR history.'));
    } finally {
      setLoadingHistory(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const loadPreview = useCallback(async () => {
    if (!projectId || !isValidMprMonth(month)) {
      setError('Select a project and valid month (YYYY-MM).');
      return;
    }
    setLoadingPreview(true);
    setError('');
    setNotice('');
    try {
      const { snapshot, meta } = await mprApi.preview(projectId, month);
      setPreview(snapshot);
      setPreviewCache(meta?.cache);
      setNotice(`Preview loaded for ${formatMprMonthLabel(month)}.`);
    } catch (err) {
      setPreview(null);
      setError(getMprApiErrorMessage(err, 'Could not load MPR preview.'));
    } finally {
      setLoadingPreview(false);
    }
  }, [projectId, month]);

  const runGenerate = useCallback(async () => {
    if (!projectId || !isValidMprMonth(month)) {
      setError('Select a project and valid month (YYYY-MM).');
      return;
    }
    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const started = await mprApi.generate(projectId, month);
      setActiveReport(started);
      if (started.status === 'generating' || started.status === 'draft') {
        setNotice('Generating MPR — this may take a minute…');
        const done = await mprApi.waitUntilReady(started.id);
        setActiveReport(done);
        if (done.status === 'failed') {
          setError(done.error_message || 'MPR generation failed.');
        } else {
          setNotice('MPR generated successfully. You can download PDF or Excel below.');
        }
      } else if (started.status === 'completed') {
        setNotice('MPR is already available for this month.');
      }
      await loadHistory();
    } catch (err) {
      setError(getMprApiErrorMessage(err, 'Could not generate MPR.'));
    } finally {
      setGenerating(false);
    }
  }, [projectId, month, loadHistory]);

  const handleRegenerate = async (mprId: number) => {
    setBusyId(mprId);
    setError('');
    setNotice('');
    try {
      const started = await mprApi.regenerate(mprId);
      if (started.status === 'generating' || started.status === 'draft') {
        setNotice('Regenerating MPR…');
        const done = await mprApi.waitUntilReady(mprId);
        if (done.status === 'failed') {
          setError(done.error_message || 'Regeneration failed.');
        } else {
          setNotice('MPR regenerated successfully.');
        }
      }
      await loadHistory();
    } catch (err) {
      setError(getMprApiErrorMessage(err, 'Could not regenerate MPR.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (mprId: number, format: 'pdf' | 'excel') => {
    setBusyId(mprId);
    setError('');
    try {
      const payload =
        format === 'pdf' ? await mprApi.getPdfUrl(mprId) : await mprApi.getExcelUrl(mprId);
      openMprDownloadUrl(payload.url);
      setNotice(`${format.toUpperCase()} download started.`);
    } catch (err) {
      setError(getMprApiErrorMessage(err, `${format.toUpperCase()} download failed.`));
    } finally {
      setBusyId(null);
    }
  };

  const monthChoices = monthOptions(36);

  const workflowSteps = [
    { n: 1, label: 'Select project & month' },
    { n: 2, label: 'Load preview' },
    { n: 3, label: 'Generate report' },
    { n: 4, label: 'Download PDF / Excel' },
  ];

  return (
    <div className={mpr.page}>
      {/* Header */}
      <header className={`${mpr.card} p-5 md:p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className={mpr.eyebrow}>Monthly Progress Report</p>
            <h1 className={`mt-1 ${mpr.title}`}>MPR Review</h1>
            <p className={`mt-2 max-w-2xl ${mpr.subtitle}`}>
              Preview consolidated project data, generate official PDF/Excel reports, and manage version history.
            </p>
          </div>
          {currentUser ? (
            <div className={mpr.userBadge}>
              <p className={`font-bold ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>Signed in</p>
              <p className={`font-black ${mpr.isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser.name}</p>
            </div>
          ) : null}
        </div>

        <ol className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          {workflowSteps.map((step) => (
            <li key={step.n} className={mpr.workflowStep}>
              <span className={mpr.workflowBadge}>{step.n}</span>
              <span className={`text-[11px] font-bold leading-tight ${mpr.isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </header>

      {/* Toolbar */}
      <div className={`${mpr.card} p-4 md:p-5`}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-5">
            <MprProjectSelect options={projectOptions} value={projectId} onChange={setProjectId} />
          </div>

          <div className="lg:col-span-3">
            <label className={`mb-1.5 flex items-center gap-1.5 ${mpr.label}`}>
              <Calendar size={12} aria-hidden />
              Report month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ colorScheme: mpr.isDark ? 'dark' : 'light' }}
              className={`${mpr.input} px-3`}
            >
              {monthChoices.map((m) => (
                <option key={m.value} value={m.value} className={mpr.selectOption}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 lg:col-span-4 lg:justify-end">
            <button
              type="button"
              onClick={() => void loadPreview()}
              disabled={loadingPreview || !projectId}
              className={mpr.btnPrimary}
            >
              {loadingPreview ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Load preview
            </button>
            <button
              type="button"
              onClick={() => void runGenerate()}
              disabled={generating || !projectId}
              className={mpr.btnSecondary}
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              Generate
            </button>
            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={loadingHistory}
              className={mpr.btnGhost}
              title="Refresh history"
            >
              <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : undefined} />
            </button>
          </div>
        </div>

        <div className={`mt-4 flex flex-wrap items-center gap-2 border-t pt-4 text-xs ${mpr.divider}`}>
          <span className={`font-bold ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>Context:</span>
          <span className={mpr.contextPill}>{selectedProjectLabel}</span>
          <span className={mpr.isDark ? 'text-slate-500' : 'text-slate-400'}>·</span>
          <span className={mpr.contextPill}>{formatMprMonthLabel(month)}</span>
          {reportForMonth ? (
            <>
              <span className={mpr.isDark ? 'text-slate-500' : 'text-slate-400'}>·</span>
              <span className={mpr.statusOk}>
                <CheckCircle2 size={12} />
                {mprStatusLabel(reportForMonth.status)} v{reportForMonth.version}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {generating ? (
        <div className={mpr.bannerGenerating}>
          <Loader2 size={18} className={`animate-spin ${mpr.isDark ? 'text-amber-300' : 'text-amber-600'}`} />
          <p className={`text-sm font-semibold ${mpr.isDark ? 'text-amber-200' : 'text-amber-800'}`}>
            Generating MPR for {formatMprMonthLabel(month)} — please wait…
          </p>
        </div>
      ) : null}

      {error ? (
        <div className={mpr.bannerError}>
          <AlertCircle size={18} className={`mt-0.5 shrink-0 ${mpr.isDark ? 'text-rose-400' : 'text-rose-600'}`} />
          <p className={`text-sm font-semibold ${mpr.isDark ? 'text-rose-300' : 'text-rose-700'}`}>{error}</p>
        </div>
      ) : null}

      {notice && !error && !generating ? (
        <div className={mpr.bannerSuccess}>
          <CheckCircle2 size={18} className={`mt-0.5 shrink-0 ${mpr.isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <p className={`text-sm font-semibold ${mpr.isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>{notice}</p>
        </div>
      ) : null}

      {activeReport && (activeReport.pdf_available || activeReport.excel_available) ? (
        <div className={`${mpr.card} flex flex-wrap items-center gap-3 p-4`}>
          <span className={`text-xs font-black uppercase tracking-wide ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Ready to download
          </span>
          {activeReport.pdf_available ? (
            <button
              type="button"
              disabled={busyId === activeReport.id}
              onClick={() => void handleDownload(activeReport.id, 'pdf')}
              className={mpr.btnDownloadPrimary}
            >
              <FileDown size={14} /> Download PDF
            </button>
          ) : null}
          {activeReport.excel_available ? (
            <button
              type="button"
              disabled={busyId === activeReport.id}
              onClick={() => void handleDownload(activeReport.id, 'excel')}
              className={mpr.btnDownloadSecondary}
            >
              <FileSpreadsheet size={14} /> Download Excel
            </button>
          ) : null}
          <span className={`text-[11px] ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Report #{activeReport.id} · {formatMprDateTimeSafe(activeReport.generated_at)}
          </span>
        </div>
      ) : null}

      {kpis.length > 0 ? <MprKpiStrip items={kpis} /> : null}

      <div className={`${mpr.cardMuted} p-1.5`}>
        <div className="flex gap-1">
          {([
            ['preview', 'Data preview', preview ? '1' : ''],
            ['history', 'Report history', history.length ? String(history.length) : ''],
          ] as const).map(([tab, label, badge]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setViewTab(tab)}
              className={viewTab === tab ? mpr.tabActive : mpr.tabInactive}
            >
              {label}
              {badge ? (
                <span className={viewTab === tab ? mpr.tabBadgeActive : mpr.tabBadgeInactive}>
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {viewTab === 'preview' ? (
        <MprPreviewPanel snapshot={preview} cacheMeta={previewCache} loading={loadingPreview} />
      ) : (
        <MprHistoryPanel
          rows={history}
          loading={loadingHistory}
          busyId={busyId}
          selectedMonth={month}
          onRegenerate={(id) => void handleRegenerate(id)}
          onDownloadPdf={(id) => void handleDownload(id, 'pdf')}
          onDownloadExcel={(id) => void handleDownload(id, 'excel')}
        />
      )}
    </div>
  );
};

function formatMprDateTimeSafe(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default MPRReviewDashboard;
