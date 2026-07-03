import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { AppNotification } from '../types';
import {
  filterNotifications,
  formatAlertRelativeTime,
  getActionTypeIcon,
  isBillingAlert,
  type AlertFilter,
} from '../utils/alertHelpers';
import { Icons } from './Icons';
import { getThemeClasses, useTheme } from '../utils/theme';

interface AlertsPageProps {
  notifications: AppNotification[];
  loading: boolean;
  refreshing?: boolean;
  onRefresh: () => void;
  onMarkRead: (id: string, isRead: boolean) => void;
  onNavigate: (notification: AppNotification) => void;
}

const FILTERS: { key: AlertFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'billing', label: 'Billing Updates' },
];

function AlertSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mb-3 h-4 w-40 rounded bg-slate-200 dark:bg-white/10" />
      <div className="mb-2 h-3 w-full rounded bg-slate-100 dark:bg-white/5" />
      <div className="mb-4 h-3 w-3/4 rounded bg-slate-100 dark:bg-white/5" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-white/5" />
        ))}
      </div>
    </div>
  );
}

const AlertsPage: React.FC<AlertsPageProps> = ({
  notifications,
  loading,
  refreshing = false,
  onRefresh,
  onMarkRead,
  onNavigate,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterNotifications(notifications, filter),
    [notifications, filter],
  );

  const selected = filtered.find((n) => n.id === selectedId) ?? null;

  const cardCls = `rounded-2xl border p-4 sm:p-5 ${isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm'
    }`;

  const metaTile = `rounded-xl border px-3 py-2 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
    }`;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
            Alerts
          </h2>
          <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
            Billing updates and system notifications
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className={`flex flex-wrap gap-2 ${cardCls} !py-3`}>
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${active
                  ? 'bg-indigo-600 text-white'
                  : isDarkTheme
                    ? 'text-slate-400 hover:bg-white/10 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="space-y-3 xl:col-span-3">
          {loading ? (
            <>
              <AlertSkeleton />
              <AlertSkeleton />
              <AlertSkeleton />
            </>
          ) : filtered.length === 0 ? (
            <div className={`${cardCls} py-16 text-center`}>
              <Icons.Notification size={36} className={`mx-auto mb-3 ${themeClasses.textMuted}`} />
              <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>No notifications available.</p>
            </div>
          ) : (
            filtered.map((n) => {
              const isSelected = selectedId === n.id;
              const actionIcon = getActionTypeIcon(n.actionType);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(n.id);
                    if (!n.isRead) onMarkRead(n.id, true);
                  }}
                  className={`${cardCls} w-full text-left transition-colors ${isSelected
                      ? isDarkTheme
                        ? 'border-indigo-500/40 ring-1 ring-indigo-500/30'
                        : 'border-indigo-300 ring-1 ring-indigo-200'
                      : isDarkTheme
                        ? 'hover:border-white/20'
                        : 'hover:border-slate-300'
                    } ${!n.isRead ? (isDarkTheme ? 'bg-white/[0.03]' : 'bg-indigo-50/60') : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${isBillingAlert(n)
                          ? isDarkTheme
                            ? 'bg-indigo-500/15 text-indigo-300'
                            : 'bg-indigo-50 text-indigo-600'
                          : isDarkTheme
                            ? 'bg-white/10 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      aria-hidden
                    >
                      {isBillingAlert(n) ? <Icons.Finance size={18} /> : actionIcon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-black ${themeClasses.textPrimary}`}>{n.title}</p>
                        {!n.isRead && (
                          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className={`mt-1 text-xs font-medium leading-relaxed ${themeClasses.textSecondary}`}>
                        {n.message}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { label: 'Project', value: n.projectName || '—' },
                          { label: 'Module', value: n.moduleName || '—' },
                          { label: 'Action', value: n.actionType || '—' },
                          { label: 'Updated By', value: n.senderName || '—' },
                        ].map((item) => (
                          <div key={item.label} className={metaTile}>
                            <p className={`text-[9px] font-bold uppercase ${themeClasses.textSecondary}`}>
                              {item.label}
                            </p>
                            <p className={`mt-0.5 truncate text-xs font-bold ${themeClasses.textPrimary}`}>
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>
                        {n.createdAt ? formatAlertRelativeTime(n.createdAt) : n.timestamp}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className={`${cardCls} xl:col-span-2 xl:sticky xl:top-4 xl:self-start`}>
          <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Notification Detail
          </h3>
          {!selected ? (
            <p className={`py-10 text-center text-sm ${themeClasses.textSecondary}`}>
              Select a notification to view details.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className={`text-sm font-black ${themeClasses.textPrimary}`}>{selected.title}</p>
                <p className={`mt-2 text-sm leading-relaxed ${themeClasses.textSecondary}`}>{selected.message}</p>
              </div>
              <div className="space-y-2">
                {[
                  ['Project Name', selected.projectName],
                  ['Module Name', selected.moduleName],
                  ['Action', selected.actionType],
                  ['Updated By', selected.senderName],
                  [
                    'Date & Time',
                    selected.createdAt
                      ? new Date(selected.createdAt).toLocaleString('en-IN')
                      : selected.timestamp,
                  ],
                  ['Read Status', selected.isRead ? 'Read' : 'Unread'],
                ].map(([label, value]) => (
                  <div key={String(label)} className={metaTile}>
                    <p className={`text-[9px] font-bold uppercase ${themeClasses.textSecondary}`}>{label}</p>
                    <p className={`mt-0.5 text-sm font-semibold ${themeClasses.textPrimary}`}>{value || '—'}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate(selected)}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black uppercase text-white hover:bg-indigo-500"
                >
                  Open Related Module
                </button>
                <button
                  type="button"
                  onClick={() => onMarkRead(selected.id, true)}
                  disabled={selected.isRead}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black uppercase text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Mark as Read
                </button>
                <button
                  type="button"
                  onClick={() => onMarkRead(selected.id, false)}
                  disabled={!selected.isRead}
                  className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase ${themeClasses.buttonSecondary} ${themeClasses.border} disabled:opacity-50`}
                >
                  Mark as Unread
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
