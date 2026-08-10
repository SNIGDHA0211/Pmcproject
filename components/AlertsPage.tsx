import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { AppNotification } from '../types';
import {
  filterNotifications,
  formatAlertDateOnly,
  formatAlertDateTime,
  formatAlertTimeOnly,
  formatAlertActorName,
  formatAlertActorRole,
  formatSubRoleUsername,
  type AlertFilter,
} from '../utils/alertHelpers';
import AlertNotificationItem from './alerts/AlertNotificationItem';
import { PendingUpdateDetail, PendingUpdateUserCard } from './alerts/PendingUpdatePanels';
import { Icons } from './Icons';
import { getThemeClasses, useTheme } from '../utils/theme';
import type { PendingUpdatesSummary } from '../utils/pmcHeadPendingUpdates';
import TutorialVideosPanel from './tutorialVideos/TutorialVideosPanel';

interface AlertsPageProps {
  notifications: AppNotification[];
  loading: boolean;
  refreshing?: boolean;
  variant?: 'default' | 'executive';
  pendingUpdates?: PendingUpdatesSummary | null;
  pendingLoading?: boolean;
  onRefresh: () => void;
  onMarkRead: (id: string, isRead: boolean) => void;
  onNavigate: (notification: AppNotification) => void;
}

const TEAM_LEAD_FILTERS: { key: AlertFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'billing', label: 'Billing Updates' },
];

const EXECUTIVE_FILTERS: { key: AlertFilter; label: string }[] = [
  { key: 'all', label: 'All Updates' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'billing', label: 'Financial' },
  { key: 'pending', label: 'Not Updated' },
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
  variant = 'default',
  pendingUpdates = null,
  pendingLoading = false,
  onRefresh,
  onMarkRead,
  onNavigate,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPendingKey, setSelectedPendingKey] = useState<string | null>(null);
  const isExecutive = variant === 'executive';
  const filters = isExecutive ? EXECUTIVE_FILTERS : TEAM_LEAD_FILTERS;
  const showPendingView = isExecutive && filter === 'pending';

  const filtered = useMemo(
    () => filterNotifications(notifications, filter),
    [notifications, filter],
  );

  const selected = filtered.find((n) => n.id === selectedId) ?? null;
  const selectedPendingGroup =
    pendingUpdates?.byUser.find(
      (group) => `${group.userIdLabel}|${group.roleBucket}` === selectedPendingKey,
    ) ?? null;

  const summaryTile = `rounded-xl border px-3 py-3 ${
    isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
  }`;

  const cardCls = `rounded-2xl border p-4 sm:p-5 ${isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm'
    }`;

  const metaTile = `rounded-xl border px-3 py-2 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
    }`;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
            {isExecutive ? 'Executive Alerts' : 'Alerts'}
          </h2>
          <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
            {isExecutive
              ? 'Updates from team leaders and site engineers across your portfolio'
              : 'Billing updates and system notifications'}
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
        {filters.map(({ key, label }) => {
          const active = filter === key;
          const pendingCount = key === 'pending' ? pendingUpdates?.totalNotUpdated : undefined;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key);
                setSelectedId(null);
                setSelectedPendingKey(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${active
                  ? key === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-indigo-600 text-white'
                  : isDarkTheme
                    ? 'text-slate-400 hover:bg-white/10 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {label}
              {pendingCount != null && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          );
        })}
      </div>

      {showPendingView && (
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 ${cardCls} !py-4`}>
          <div className={summaryTile}>
            <p className={`text-[9px] font-bold uppercase ${themeClasses.textSecondary}`}>Total Not Updated</p>
            <p className={`mt-1 text-2xl font-black ${themeClasses.textPrimary}`}>
              {pendingUpdates?.totalNotUpdated ?? 0}
            </p>
            <p className={`mt-1 text-[9px] font-semibold ${themeClasses.textSecondary}`}>Sub-roles</p>
          </div>
          {(pendingUpdates?.byRoleBucket ?? []).map((bucket) => (
            <div key={bucket.key} className={summaryTile}>
              <p className={`text-[9px] font-bold uppercase ${themeClasses.textSecondary}`}>
                {bucket.shortLabel} Not Updated
              </p>
              <p className={`mt-1 text-2xl font-black ${themeClasses.textPrimary}`}>
                {bucket.notUpdatedCount}
              </p>
              <p className={`mt-1 text-[9px] font-semibold ${themeClasses.textSecondary}`}>
                {bucket.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {!showPendingView && (
        <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>
          Showing {filtered.length} notification{filtered.length === 1 ? '' : 's'}
        </p>
      )}

      {showPendingView && pendingUpdates && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>
            Tracking window: last {pendingUpdates.windowDays} days · {pendingUpdates.totalNotUpdated} sub-role
            {pendingUpdates.totalNotUpdated === 1 ? '' : 's'} with missing section updates · TL{' '}
            {pendingUpdates.byRoleBucket.find((b) => b.key === 'tl')?.notUpdatedCount ?? 0} · SE{' '}
            {pendingUpdates.byRoleBucket.find((b) => b.key === 'se')?.notUpdatedCount ?? 0} · QAQC{' '}
            {pendingUpdates.byRoleBucket.find((b) => b.key === 'qaqc')?.notUpdatedCount ?? 0} · BSE{' '}
            {pendingUpdates.byRoleBucket.find((b) => b.key === 'bse')?.notUpdatedCount ?? 0}
          </p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || pendingLoading}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ${themeClasses.buttonSecondary} ${themeClasses.border}`}
          >
            <RefreshCw size={12} className={refreshing || pendingLoading ? 'animate-spin' : ''} />
            Refresh List
          </button>
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-3 xl:grid-cols-5 xl:gap-4 ${
          showPendingView ? 'xl:h-[calc(100vh-19.5rem)] xl:min-h-[24rem]' : ''
        }`}
      >
        <div
          className={`xl:col-span-3 ${
            showPendingView
              ? 'flex min-h-0 flex-col overflow-hidden rounded-2xl border p-2 sm:p-3 ' +
                (isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm')
              : 'space-y-3'
          }`}
        >
          {showPendingView && (
            <p className={`mb-2 shrink-0 px-1 text-[9px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
              Team Members ({pendingUpdates?.byUser.length ?? 0})
            </p>
          )}
          <div className={showPendingView ? 'min-h-0 flex-1 space-y-2 overflow-y-auto pr-1' : 'space-y-3'}>
          {showPendingView ? (
            pendingLoading || loading ? (
              <>
                <AlertSkeleton />
                <AlertSkeleton />
                <AlertSkeleton />
              </>
            ) : !pendingUpdates || pendingUpdates.byUser.length === 0 ? (
              <div className={`${cardCls} py-16 text-center`}>
                <Icons.Check size={36} className={`mx-auto mb-3 ${themeClasses.textMuted}`} />
                <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>
                  All assigned team members are up to date.
                </p>
                <p className={`mx-auto mt-2 max-w-sm text-xs ${themeClasses.textSecondary}`}>
                  Everyone has submitted updates for all assigned sections in the last {pendingUpdates?.windowDays ?? 30} days.
                </p>
              </div>
            ) : (
              pendingUpdates.byUser.map((group) => {
                const groupKey = `${group.userIdLabel}|${group.roleBucket}`;
                return (
                  <PendingUpdateUserCard
                    key={groupKey}
                    group={group}
                    isDarkTheme={isDarkTheme}
                    isSelected={selectedPendingKey === groupKey}
                    onClick={() => setSelectedPendingKey(groupKey)}
                  />
                );
              })
            )
          ) : loading ? (
            <>
              <AlertSkeleton />
              <AlertSkeleton />
              <AlertSkeleton />
            </>
          ) : filtered.length === 0 ? (
            <div className={`${cardCls} py-16 text-center`}>
              <Icons.Notification size={36} className={`mx-auto mb-3 ${themeClasses.textMuted}`} />
              <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>
                {isExecutive ? 'No team updates yet.' : 'No notifications available.'}
              </p>
              {isExecutive && (
                <p className={`mx-auto mt-2 max-w-sm text-xs ${themeClasses.textSecondary}`}>
                  When a team leader or site engineer updates schedule, financials, drawings, or other project data, the update will appear here with who changed it and when.
                </p>
              )}
            </div>
          ) : (
            filtered.map((n) => {
              const isSelected = selectedId === n.id;
              return (
                <div
                  key={n.id}
                  className={isSelected
                    ? isDarkTheme
                      ? 'rounded-2xl ring-1 ring-indigo-500/30'
                      : 'rounded-2xl ring-1 ring-indigo-200'
                    : ''}
                >
                  <AlertNotificationItem
                    notification={n}
                    isDarkTheme={isDarkTheme}
                    onClick={() => {
                      setSelectedId(n.id);
                      if (!n.isRead) onMarkRead(n.id, true);
                    }}
                  />
                </div>
              );
            })
          )}
          </div>
        </div>

        <div
          className={`xl:col-span-2 ${
            showPendingView
              ? 'flex min-h-0 flex-col overflow-hidden ' + cardCls
              : `${cardCls} xl:sticky xl:top-4 xl:self-start`
          }`}
        >
          <h3 className={`mb-2 shrink-0 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            {showPendingView ? 'Pending Detail' : 'Notification Detail'}
          </h3>
          <div className={showPendingView ? 'min-h-0 flex-1 overflow-y-auto pr-1' : ''}>
          {showPendingView ? (
            <PendingUpdateDetail
              group={selectedPendingGroup}
              isDarkTheme={isDarkTheme}
              windowDays={pendingUpdates?.windowDays ?? 30}
            />
          ) : !selected ? (
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
                  ['Updated By', formatAlertActorName(selected)],
                  ['User ID', formatSubRoleUsername(selected.senderUsername) || selected.senderUsername || '—'],
                  ['Role', formatAlertActorRole(selected) || '—'],
                  ['What Changed', selected.message || selected.title],
                  ['Project', selected.projectName],
                  ['Module', selected.moduleName],
                  ['Action', selected.actionType],
                  ['Date', formatAlertDateOnly(selected.createdAt)],
                  ['Time', formatAlertTimeOnly(selected.createdAt)],
                  [
                    'Full Timestamp',
                    selected.createdAt
                      ? formatAlertDateTime(selected.createdAt)
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
                  {isExecutive ? 'Open Project Review' : 'Open Related Module'}
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

      <TutorialVideosPanel section="alerts" />
    </div>
  );
};

export default AlertsPage;
