import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import type { Project, User } from '../../types';
import { UserRole } from '../../types';
import {
  completeReminder,
  dismissReminder,
  getReminderApiErrorMessage,
  listReminders,
  snoozeReminder,
  type ReminderRecord,
  type ReminderScope,
  type ReminderStatus,
} from '../../services/remindersApi';
import { groupReminders, REMINDER_REFRESH_MS } from '../../utils/reminderHelpers';
import { clearReminderDueToastClaim } from '../../utils/reminderNotifications';
import {
  clearReminderAlarmStop,
  haltReminderAlarmAudio,
  stopReminderAlarmSession,
} from '../../utils/reminderAlarm';
import { sanitizeProjectDisplayName } from '../../utils/hseSiteEngineerProjects';
import { getThemeClasses, useTheme } from '../../utils/theme';
import { isAbortError } from '../../utils/isAbortError';
import DashboardToastStack, { type DashboardToastItem } from '../DashboardToastStack';
import ReminderCard from './ReminderCard';
import ReminderModal from './ReminderModal';

interface RemindersPageProps {
  projects: Project[];
  currentUser: User;
  /** Optional project focus from alert deep-link */
  initialProjectId?: string | null;
  onBadgeCountsChange?: (total: number) => void;
}

const SCOPE_TABS: { key: ReminderScope; label: string }[] = [
  { key: 'mine', label: 'My reminders' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'all', label: 'All' },
];

const RemindersPage: React.FC<RemindersPageProps> = ({
  projects,
  currentUser,
  initialProjectId = null,
  onBadgeCountsChange,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [scope, setScope] = useState<ReminderScope>('mine');
  const [statusFilter, setStatusFilter] = useState<ReminderStatus | ''>('');
  const [projectFilter, setProjectFilter] = useState(
    initialProjectId ? String(initialProjectId) : '',
  );
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ReminderRecord[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReminderRecord | null>(null);
  const [toasts, setToasts] = useState<DashboardToastItem[]>([]);

  const pushToast = (message: string, type: DashboardToastItem['type'] = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const loadList = useCallback(
    async (opts?: { silent?: boolean; signal?: AbortSignal }) => {
      if (opts?.silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const result = await listReminders({
          scope,
          status: statusFilter || undefined,
          project_id: projectFilter || undefined,
          search: search.trim() || undefined,
          page_size: 100,
          ordering: 'due_at',
          signal: opts?.signal,
        });
        setItems(result.results);
        setCount(result.count);
        if (onBadgeCountsChange) {
          const active = result.results.filter(
            (r) =>
              (r.status === 'pending' || r.status === 'sent' || r.status === 'snoozed') &&
              (r.is_overdue || scope === 'today' || scope === 'overdue'),
          );
          // Prefer dedicated badge refresh via separate call in App; keep lightweight here.
          void active;
        }
      } catch (err) {
        if (isAbortError(err)) return;
        setError(getReminderApiErrorMessage(err, 'Could not load reminders.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [scope, statusFilter, projectFilter, search, onBadgeCountsChange],
  );

  useEffect(() => {
    if (initialProjectId) setProjectFilter(String(initialProjectId));
  }, [initialProjectId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadList({ signal: controller.signal });
    return () => controller.abort();
  }, [loadList]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadList({ silent: true });
    }, REMINDER_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadList]);

  const grouped = useMemo(() => groupReminders(items), [items]);

  const runAction = async (
    id: number,
    work: () => Promise<ReminderRecord>,
    successMsg: string,
    opts?: { clearDueToast?: boolean },
  ) => {
    setBusyId(id);
    try {
      const updated = await work();
      setItems((prev) => {
        const next = prev.map((row) => (row.id === updated.id ? updated : row));
        // Keep completed/dismissed visible under "done" grouping when scope still returns them.
        return next;
      });
      if (opts?.clearDueToast) {
        clearReminderDueToastClaim(id);
        haltReminderAlarmAudio();
        if (updated.status === 'snoozed') {
          clearReminderAlarmStop(id);
        } else if (updated.status === 'completed' || updated.status === 'dismissed') {
          stopReminderAlarmSession(id);
        }
      }
      pushToast(successMsg);
      await loadList({ silent: true });
      onBadgeCountsChange?.(0);
    } catch (err) {
      pushToast(getReminderApiErrorMessage(err, 'Action failed.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const cardCls = `rounded-2xl border ${
    isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm'
  }`;

  const renderGroup = (title: string, rows: ReminderRecord[]) => {
    if (rows.length === 0) return null;
    return (
      <section className="space-y-3">
        <h3 className={`text-xs font-black uppercase tracking-wider ${themeClasses.textSecondary}`}>
          {title} ({rows.length})
        </h3>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              busy={busyId === reminder.id}
              onComplete={(id) =>
                void runAction(id, () => completeReminder(id), 'Reminder completed', {
                  clearDueToast: true,
                })
              }
              onDismiss={(id) =>
                void runAction(id, () => dismissReminder(id), 'Reminder dismissed', {
                  clearDueToast: true,
                })
              }
              onSnooze={(id, minutes) =>
                void runAction(
                  id,
                  () => snoozeReminder(id, { minutes }),
                  `Snoozed for ${minutes >= 1440 ? '1 day' : '1 hour'}`,
                  { clearDueToast: true },
                )
              }
              onEdit={(row) => {
                setEditing(row);
                setModalOpen(true);
              }}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 animate-in fade-in duration-500">
      <header
        className={`flex flex-wrap items-end justify-between gap-3 rounded-2xl border px-4 py-3.5 sm:px-5 ${
          isDarkTheme
            ? 'border-indigo-500/25 bg-indigo-500/10'
            : 'border-indigo-100 bg-white shadow-sm'
        }`}
      >
        <div>
          <h2 className={`text-xl font-black tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
            Reminders
          </h2>
          <p className={`mt-0.5 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
            Create and track project reminders — separate from Alerts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadList({ silent: true })}
            disabled={refreshing}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${
              isDarkTheme
                ? 'border-white/15 text-slate-200 hover:bg-white/10'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500"
          >
            <Plus size={14} />
            New Reminder
          </button>
        </div>
      </header>

      <section className={`${cardCls} p-4 sm:p-5`}>
        <div className="flex flex-wrap gap-2 mb-4">
          {SCOPE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setScope(tab.key)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                scope === tab.key
                  ? 'bg-indigo-600 text-white'
                  : isDarkTheme
                    ? 'bg-white/8 text-slate-300 hover:bg-white/12'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title or description…"
              className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${
                isDarkTheme
                  ? 'border-white/10 bg-white/5 text-white'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            />
          </div>
          <div>
            <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>
              Project
            </label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${
                isDarkTheme
                  ? 'border-white/10 bg-white/5 text-white'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {sanitizeProjectDisplayName(p.title) || p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReminderStatus | '')}
              className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${
                isDarkTheme
                  ? 'border-white/10 bg-white/5 text-white'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Notified</option>
              <option value="snoozed">Snoozed</option>
              <option value="completed">Completed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <section className={`${cardCls} p-4 sm:p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className={`text-sm font-black ${themeClasses.textPrimary}`}>
            Reminders ({count})
          </h3>
        </div>

        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className={`py-14 text-center text-sm font-semibold ${themeClasses.textSecondary}`}>
            No reminders found. Create one to get started.
          </div>
        ) : (
          <div className="space-y-6">
            {renderGroup('Overdue', grouped.overdue)}
            {renderGroup('Due today', grouped.today)}
            {renderGroup('Upcoming', grouped.upcoming)}
            {renderGroup('Completed / dismissed', grouped.done)}
          </div>
        )}
      </section>

      <ReminderModal
        open={modalOpen}
        projects={projects}
        currentUser={currentUser}
        editing={editing}
        lockedProjectId={projectFilter || null}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          pushToast(editing ? 'Reminder updated' : 'Reminder created');
          void loadList({ silent: true });
        }}
      />

      <DashboardToastStack toasts={toasts} />
    </div>
  );
};

export default RemindersPage;
