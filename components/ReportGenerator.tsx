import React, { useEffect, useMemo, useState } from 'react';
import { Project, User } from '../types';
import { Icons } from './Icons';
import { formatINR } from '../utils/format';
import { dprApi, getApiErrorMessage, unwrapList } from '../services/api';
import { fetchProjectProgressChart } from '../services/financialDataService';
import {
  formatCompletedBillingLabel,
  formatCompletionDate,
  getProjectCompletionBillingLabel,
  isProjectCompleted,
} from '../utils/projectCompletion';
import { getLatestProjectProgressPoint } from '../utils/projectProgress';
import { sanitizeProjectDisplayName } from '../utils/hseSiteEngineerProjects';
import { useTheme, getThemeClasses } from '../utils/theme';

interface ReportGeneratorProps {
  project: Project;
  onClose: () => void;
  user: User;
}

type ReportActivity = {
  name: string;
  deliverables: string;
  target: number;
  achieved: number;
  unit: string;
  status: string;
};

type ReportDprRow = {
  id: string;
  date: string;
  dateSort: number;
  status: string;
  submittedBy: string;
  workSummary: string;
  manpower: number;
  criticalIssues: string;
  billingStatus: string;
  weather: string;
  activities: ReportActivity[];
};

function formatStatusLabel(status: string): string {
  const s = String(status || '').trim();
  if (!s) return 'Unknown';
  return s
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('approv')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (s.includes('reject')) return 'bg-rose-100 text-rose-800 border-rose-200';
  if (s.includes('pending')) return 'bg-amber-100 text-amber-900 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function parseDprDate(raw: unknown): { label: string; sort: number } {
  const value = String(raw ?? '').trim();
  if (!value) {
    return { label: '—', sort: 0 };
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return {
      label: d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      sort: d.getTime(),
    };
  }
  return { label: value, sort: 0 };
}

function normalizeDprRow(row: Record<string, unknown>): ReportDprRow {
  const activitiesRaw = Array.isArray(row.activities) ? row.activities : [];
  const activities: ReportActivity[] = activitiesRaw.map((act: any) => ({
    name: String(act.activity ?? act.name ?? act.description ?? 'Activity').trim() || 'Activity',
    deliverables: String(act.deliverables ?? act.remarks ?? '').trim(),
    target: Number(act.target ?? act.planned ?? act.scope ?? 0) || 0,
    achieved: Number(act.target_achieved ?? act.achieved ?? act.today_progress ?? 0) || 0,
    unit: String(act.unit ?? '').trim(),
    status: String(act.status ?? '').trim() || '—',
  }));

  const workFromActivities = activities
    .map((a) => (a.deliverables ? `${a.name}: ${a.deliverables}` : a.name))
    .filter(Boolean)
    .join('; ');

  const workSummary =
    String(row.work_done ?? row.workDescription ?? row.work_description ?? '').trim() ||
    workFromActivities ||
    'No work description recorded';

  const dateInfo = parseDprDate(row.report_date ?? row.date ?? row.created_at);
  const manpower =
    Number(row.manpower_count ?? row.manpower ?? 0) ||
    (activities.length > 0
      ? Math.max(
          0,
          Math.round(
            activities.reduce((sum, a) => sum + a.achieved, 0) / Math.max(1, activities.length),
          ),
        )
      : 0);

  return {
    id: String(row.id ?? `${dateInfo.sort}-${Math.random()}`),
    date: dateInfo.label,
    dateSort: dateInfo.sort,
    status: String(row.status ?? 'PENDING').toUpperCase(),
    submittedBy: String(row.issued_by_name ?? row.issued_by ?? row.submitted_by ?? '—').trim() || '—',
    workSummary,
    manpower,
    criticalIssues: String(
      row.unresolved_issues ?? row.critical_issues ?? row.criticalIssues ?? '',
    ).trim(),
    billingStatus: String(row.bill_status ?? row.billing_status ?? '').trim(),
    weather: String(row.weather ?? row.weather_condition ?? '').trim(),
    activities,
  };
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ project, onClose, user }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const completed = isProjectCompleted(project);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dprs, setDprs] = useState<ReportDprRow[]>([]);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [progressPlanPct, setProgressPlanPct] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const projectNames = useMemo(() => {
    const names = [project.title, project.apiName]
      .map((n) => sanitizeProjectDisplayName(String(n ?? '')).trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [project.title, project.apiName]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let rows: Record<string, unknown>[] = [];
        for (const name of projectNames) {
          try {
            const res = await dprApi.getDPRs({ project_name: name, page: 1 });
            const list = unwrapList<Record<string, unknown>>(res.data);
            if (list.length > 0) {
              rows = list;
              break;
            }
          } catch {
            // try next name
          }
        }

        // Fallback: fetch all and filter by project name/id
        if (rows.length === 0) {
          const res = await dprApi.getDPRs();
          const list = unwrapList<Record<string, unknown>>(res.data);
          const titleKey = sanitizeProjectDisplayName(project.title).toLowerCase();
          rows = list.filter((row) => {
            const pn = sanitizeProjectDisplayName(
              String(row.project_name ?? row.projectName ?? ''),
            ).toLowerCase();
            const pid = String(row.project ?? row.project_id ?? '');
            return (
              (pn && (pn === titleKey || pn.includes(titleKey) || titleKey.includes(pn))) ||
              pid === String(project.id)
            );
          });
        }

        const normalized = rows
          .map(normalizeDprRow)
          .sort((a, b) => b.dateSort - a.dateSort);

        if (!cancelled) {
          setDprs(normalized);
          setSelectedId(normalized[0]?.id ?? null);
        }

        try {
          const chart = await fetchProjectProgressChart(
            project.apiName || project.title,
          );
          const latest = getLatestProjectProgressPoint(chart);
          if (!cancelled && latest) {
            setProgressPct(latest.cumulativeActual);
            setProgressPlanPct(latest.cumulativePlanned);
          }
        } catch {
          // progress optional
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Unable to load DPR records for this project.'));
          setDprs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [project.id, project.title, project.apiName, projectNames]);

  const selected = useMemo(
    () => dprs.find((d) => d.id === selectedId) ?? dprs[0] ?? null,
    [dprs, selectedId],
  );

  const summary = useMemo(() => {
    const total = dprs.length;
    const approved = dprs.filter((d) => d.status.includes('APPROV')).length;
    const pending = dprs.filter((d) => d.status.includes('PENDING')).length;
    const rejected = dprs.filter((d) => d.status.includes('REJECT')).length;
    const withIssues = dprs.filter((d) => d.criticalIssues).length;
    const latestDate = dprs[0]?.date ?? '—';
    const oldestDate = dprs.length ? dprs[dprs.length - 1]?.date : '—';
    return { total, approved, pending, rejected, withIssues, latestDate, oldestDate };
  }, [dprs]);

  const generatedOn = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-[110] flex justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-md sm:p-6 md:p-10">
      <div
        className={`relative my-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl print:my-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none ${
          isDarkTheme ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        {/* Toolbar — hidden when printing */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-b p-4 print:hidden ${
            isDarkTheme ? 'border-white/10 bg-slate-900/90' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="min-w-0">
            <h2 className={`text-sm font-black uppercase tracking-wide ${themeClasses.textPrimary}`}>
              Project DPR Report
            </h2>
            <p className={`truncate text-xs font-semibold ${themeClasses.textSecondary}`}>
              {project.title}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#16304f] disabled:opacity-50"
            >
              <Icons.Download size={14} />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border p-2 ${themeClasses.border} ${themeClasses.buttonSecondary}`}
              aria-label="Close report"
            >
              <Icons.Reject size={18} />
            </button>
          </div>
        </div>

        {/* Printable body — light for readability */}
        <div className="flex-1 space-y-6 bg-white p-5 text-slate-900 sm:p-8 md:p-10 print:p-6">
          {/* Cover / header */}
          <header className="space-y-4 border-b border-slate-200 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Daily Progress Report · Consolidated
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {project.title}
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Client: {project.client || '—'} · Location: {project.location || '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Generated
                </p>
                <p className="text-sm font-bold text-slate-800">{generatedOn}</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  By {user.name || user.username || 'PMC User'}
                </p>
              </div>
            </div>

            {completed && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-black uppercase tracking-wide text-emerald-800">
                  {getProjectCompletionBillingLabel(project)}
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  Completed on {formatCompletionDate(project.completedAt)}
                  {project.completedBy ? ` · by ${project.completedBy}` : ''}
                  {project.billingStatus
                    ? ` · ${formatCompletedBillingLabel(project.billingStatus)}`
                    : ''}
                </p>
                {project.completionNotes ? (
                  <p className="mt-2 text-sm text-emerald-900">{project.completionNotes}</p>
                ) : null}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Total DPRs
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">
                  {loading ? '…' : summary.total}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Approved
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-emerald-800">
                  {loading ? '…' : summary.approved}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  Pending
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-amber-900">
                  {loading ? '…' : summary.pending}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Physical Progress
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">
                  {progressPct == null ? '—' : `${Math.round(progressPct)}%`}
                </p>
                {progressPlanPct != null && (
                  <p className="text-[10px] font-semibold text-slate-500">
                    Plan {Math.round(progressPlanPct)}%
                  </p>
                )}
              </div>
            </div>
          </header>

          {/* Project facts */}
          <section>
            <h2 className="text-sm font-black uppercase tracking-wide text-[#1e3a5f]">
              1. Project snapshot
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Budget', project.budget ? formatINR(project.budget) : '—'],
                ['Team Lead', project.teamLeadName || 'Not assigned'],
                ['Commencement', project.commencementDate || '—'],
                ['Duration', project.duration || '—'],
                ['DPR period', summary.total ? `${summary.oldestDate} → ${summary.latestDate}` : 'No DPRs yet'],
                ['Open issues in DPRs', String(summary.withIssues)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {loading && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-16 text-sm font-semibold text-slate-500">
              <Icons.Loader size={18} className="animate-spin" />
              Loading DPR records…
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {!loading && !error && dprs.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
              <p className="text-sm font-bold text-slate-700">No DPR records found for this project</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Site engineers can submit daily progress reports; they will appear here automatically.
              </p>
            </div>
          )}

          {!loading && dprs.length > 0 && (
            <>
              {/* Register */}
              <section className="print:break-inside-avoid">
                <h2 className="text-sm font-black uppercase tracking-wide text-[#1e3a5f]">
                  2. DPR register ({dprs.length})
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Click a row to see full day details below. Newest first.
                </p>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Submitted by</th>
                        <th className="px-3 py-2.5">Work summary</th>
                        <th className="px-3 py-2.5 text-right">Manpower</th>
                        <th className="px-3 py-2.5">Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dprs.map((row) => {
                        const active = selected?.id === row.id;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedId(row.id)}
                            className={`cursor-pointer transition-colors print:cursor-default ${
                              active ? 'bg-sky-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="whitespace-nowrap px-3 py-2.5 font-bold text-slate-800">
                              {row.date}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${statusTone(row.status)}`}
                              >
                                {formatStatusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-slate-700">
                              {row.submittedBy}
                            </td>
                            <td className="max-w-[220px] truncate px-3 py-2.5 text-slate-600">
                              {row.workSummary}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-800">
                              {row.manpower || '—'}
                            </td>
                            <td className="max-w-[140px] truncate px-3 py-2.5 text-slate-600">
                              {row.criticalIssues || 'None'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Selected day detail */}
              {selected && (
                <section className="print:break-inside-avoid">
                  <h2 className="text-sm font-black uppercase tracking-wide text-[#1e3a5f]">
                    3. Day detail — {selected.date}
                  </h2>
                  <div className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Status</p>
                        <p className="mt-0.5 text-sm font-bold">{formatStatusLabel(selected.status)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Submitted by</p>
                        <p className="mt-0.5 text-sm font-bold">{selected.submittedBy}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Manpower</p>
                        <p className="mt-0.5 text-sm font-bold">{selected.manpower || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Weather</p>
                        <p className="mt-0.5 text-sm font-bold">{selected.weather || '—'}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Work done</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-800">
                        {selected.workSummary}
                      </p>
                    </div>

                    {selected.criticalIssues ? (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase text-rose-700">
                          Critical / unresolved issues
                        </p>
                        <p className="mt-1 text-sm font-semibold text-rose-900">
                          {selected.criticalIssues}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-emerald-700">
                        No critical issues recorded for this day.
                      </p>
                    )}

                    {selected.billingStatus ? (
                      <p className="text-xs font-semibold text-slate-600">
                        Billing note on DPR: {selected.billingStatus}
                      </p>
                    ) : null}

                    {selected.activities.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full min-w-[520px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                              <th className="px-3 py-2">Activity</th>
                              <th className="px-3 py-2">Deliverables / remarks</th>
                              <th className="px-3 py-2 text-right">Target</th>
                              <th className="px-3 py-2 text-right">Achieved</th>
                              <th className="px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selected.activities.map((act, idx) => (
                              <tr key={`${act.name}-${idx}`}>
                                <td className="px-3 py-2 font-bold text-slate-800">{act.name}</td>
                                <td className="px-3 py-2 text-slate-600">
                                  {act.deliverables || '—'}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {act.target
                                    ? `${act.target}${act.unit ? ` ${act.unit}` : ''}`
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 text-right font-bold tabular-nums">
                                  {act.achieved
                                    ? `${act.achieved}${act.unit ? ` ${act.unit}` : ''}`
                                    : '—'}
                                </td>
                                <td className="px-3 py-2 text-xs font-bold uppercase text-slate-600">
                                  {act.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-slate-500">
                        No activity line items attached to this DPR.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}

          {/* How to read */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 print:break-inside-avoid">
            <h2 className="text-sm font-black uppercase tracking-wide text-[#1e3a5f]">
              How to read this report
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-medium leading-relaxed text-slate-600">
              <li>
                <strong>Total DPRs</strong> = number of daily progress reports submitted for this
                project.
              </li>
              <li>
                <strong>Approved / Pending</strong> = workflow status after Team Lead / PMC review.
              </li>
              <li>
                <strong>Physical progress</strong> = latest cumulative actual % from project progress
                (S-curve), when available.
              </li>
              <li>
                Use <strong>Print / Save PDF</strong> to download a copy for meetings or handover.
              </li>
            </ul>
          </section>

          {/* Sign-off */}
          <section className="grid grid-cols-1 gap-8 pt-6 sm:grid-cols-3 print:break-inside-avoid">
            {['Site Engineer', 'Team Lead', 'PMC Head / Client'].map((role) => (
              <div key={role} className="text-center">
                <div className="mb-8 h-px w-full bg-slate-300" />
                <p className="text-xs font-black uppercase text-slate-800">{role}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">Signature / Date</p>
              </div>
            ))}
          </section>

          <footer className="border-t border-slate-200 pt-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            PMC DPR Consolidated Report · Project ID {project.id} · {generatedOn}
          </footer>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
