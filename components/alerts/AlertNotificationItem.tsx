import React from 'react';
import type { AppNotification } from '../../types';
import { Icons } from '../Icons';
import {
  formatAlertDateOnly,
  formatAlertTimeOnly,
  formatAlertActorName,
  formatAlertActorRole,
  formatSubRoleUsername,
  getAlertActionVisuals,
} from '../../utils/alertHelpers';

interface AlertNotificationItemProps {
  notification: AppNotification;
  isDarkTheme: boolean;
  compact?: boolean;
  onClick?: () => void;
}

const AlertNotificationItem: React.FC<AlertNotificationItemProps> = ({
  notification,
  isDarkTheme,
  compact = false,
  onClick,
}) => {
  const visuals = getAlertActionVisuals(notification.actionType, notification.notificationType);
  const senderName = formatAlertActorName(notification);
  const senderRole = formatAlertActorRole(notification);
  const userIdLabel = formatSubRoleUsername(notification.senderUsername);
  const project = notification.projectName?.trim();
  const module = notification.moduleName?.trim();
  const dateLabel = formatAlertDateOnly(notification.createdAt);
  const timeLabel = formatAlertTimeOnly(notification.createdAt);

  const ActionIcon =
    visuals.iconKey === 'finance'
      ? Icons.Finance
      : visuals.iconKey === 'create'
        ? Icons.Add
        : visuals.iconKey === 'delete'
          ? Icons.Reject
          : visuals.iconKey === 'update'
            ? Icons.Edit
            : Icons.Notification;

  const containerCls = compact
    ? `p-3.5 border-b cursor-pointer transition-colors relative ${isDarkTheme
        ? `border-white/5 hover:bg-white/10 ${!notification.isRead ? 'bg-white/5' : ''}`
        : `border-gray-100 hover:bg-slate-50 ${!notification.isRead ? 'bg-indigo-50/70' : ''}`
      }`
    : `rounded-2xl border p-4 sm:p-5 cursor-pointer transition-colors relative ${isDarkTheme
        ? `border-white/10 hover:border-white/20 ${!notification.isRead ? 'bg-white/[0.03]' : 'bg-white/[0.02]'}`
        : `border-slate-200 bg-white shadow-sm hover:border-slate-300 ${!notification.isRead ? 'bg-indigo-50/50' : ''}`
      }`;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={containerCls}
    >
      <div className="flex gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkTheme ? visuals.darkBg : visuals.lightBg}`}
          aria-hidden
        >
          <ActionIcon size={16} className={isDarkTheme ? visuals.darkColor : visuals.lightColor} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${isDarkTheme ? visuals.darkBadge : visuals.lightBadge}`}
            >
              {visuals.label}
            </span>
            {!notification.isRead && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
                New
              </span>
            )}
          </div>

          <p
            className={`mt-1.5 text-xs font-black leading-snug ${isDarkTheme ? 'text-contrast' : 'text-slate-900'}`}
          >
            {notification.title}
          </p>

          {notification.message && (
            <p
              className={`mt-1 text-[11px] font-medium leading-relaxed ${isDarkTheme ? 'text-white/70' : 'text-slate-600'}`}
            >
              {notification.message}
            </p>
          )}

          <div
            className={`mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold ${isDarkTheme ? 'text-white/60' : 'text-slate-500'}`}
          >
            <span className={isDarkTheme ? 'text-indigo-300' : 'text-indigo-700'}>
              {senderName}
            </span>
            {userIdLabel && userIdLabel !== senderName && (
              <span
                className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${isDarkTheme ? 'bg-indigo-500/15 text-indigo-200' : 'bg-indigo-50 text-indigo-700'}`}
              >
                {userIdLabel}
              </span>
            )}
            {senderRole && (
              <span
                className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${isDarkTheme ? 'bg-white/10 text-white/75' : 'bg-slate-100 text-slate-600'}`}
              >
                {senderRole}
              </span>
            )}
          </div>

          {(project || module) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {project && (
                <span
                  className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isDarkTheme ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-700'}`}
                >
                  {project}
                </span>
              )}
              {module && (
                <span
                  className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isDarkTheme ? 'bg-indigo-500/15 text-indigo-200' : 'bg-indigo-50 text-indigo-700'}`}
                >
                  {module}
                </span>
              )}
            </div>
          )}

          <div
            className={`mt-2.5 flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-wide ${isDarkTheme ? 'text-white/45' : 'text-slate-400'}`}
          >
            <span>{dateLabel}</span>
            <span aria-hidden className="opacity-50">
              |
            </span>
            <span>{timeLabel}</span>
          </div>
        </div>
      </div>

      {!notification.isRead && compact && (
        <div
          className={`absolute right-3 top-3 h-2 w-2 rounded-full ${isDarkTheme ? 'bg-indigo-400' : 'bg-indigo-500'}`}
          aria-hidden
        />
      )}
    </div>
  );
};

export default AlertNotificationItem;
