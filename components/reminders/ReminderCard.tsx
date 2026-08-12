import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock3, MoreHorizontal, X } from 'lucide-react';
import type { ReminderRecord } from '../../services/remindersApi';
import {
  formatReminderDateTime,
  reminderPersonLabel,
  reminderStatusClasses,
  reminderStatusLabel,
} from '../../utils/reminderHelpers';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface ReminderCardProps {
  reminder: ReminderRecord;
  busy?: boolean;
  onComplete: (id: number) => void;
  onDismiss: (id: number) => void;
  onSnooze: (id: number, minutes: number) => void;
  onEdit?: (reminder: ReminderRecord) => void;
}

const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  busy = false,
  onComplete,
  onDismiss,
  onSnooze,
  onEdit,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    // Defer so the opening click does not immediately close the menu.
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', onPointerDown);
      document.addEventListener('touchstart', onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [menuOpen]);

  const active =
    reminder.status === 'pending' ||
    reminder.status === 'sent' ||
    reminder.status === 'snoozed';

  const dueDisplay = formatReminderDateTime(
    reminder.status === 'snoozed' && reminder.snoozed_until
      ? reminder.snoozed_until
      : reminder.due_at,
  );

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        isDarkTheme
          ? 'border-white/10 bg-white/[0.03]'
          : 'border-slate-200 bg-white shadow-sm'
      } ${reminder.is_overdue && active ? (isDarkTheme ? 'ring-1 ring-rose-400/40' : 'ring-1 ring-rose-200') : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`truncate text-sm font-black ${themeClasses.textPrimary}`}>
              {reminder.title}
            </h3>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${reminderStatusClasses(
                reminder.status,
                isDarkTheme,
              )}`}
            >
              {reminderStatusLabel(reminder.status)}
            </span>
            {reminder.is_overdue && active && (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isDarkTheme ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-700'
                }`}
              >
                Overdue
              </span>
            )}
          </div>
          {reminder.description ? (
            <p className={`mt-1 line-clamp-2 text-xs font-medium ${themeClasses.textSecondary}`}>
              {reminder.description}
            </p>
          ) : null}
          <div className={`mt-3 grid gap-1 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
            <p>
              Project:{' '}
              <span className={themeClasses.textPrimary}>{reminder.project_name || '—'}</span>
            </p>
            <p>
              Due: <span className={themeClasses.textPrimary}>{dueDisplay}</span>
            </p>
            {reminder.status === 'snoozed' && reminder.snoozed_until ? (
              <p>
                Snoozed until:{' '}
                <span className={themeClasses.textPrimary}>
                  {formatReminderDateTime(reminder.snoozed_until)}
                </span>
              </p>
            ) : null}
            <p>
              Assigned to:{' '}
              <span className={themeClasses.textPrimary}>
                {reminderPersonLabel(reminder.assigned_to)}
              </span>
            </p>
          </div>
        </div>

        {active && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className={`rounded-lg border p-2 ${
                isDarkTheme
                  ? 'border-white/10 text-slate-300 hover:bg-white/10'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              aria-label="Reminder actions"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div
                className={`absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border shadow-lg ${
                  isDarkTheme
                    ? 'border-white/10 bg-slate-900'
                    : 'border-slate-200 bg-white'
                }`}
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    onComplete(reminder.id);
                  }}
                >
                  <Check size={14} /> Complete
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    onSnooze(reminder.id, 60);
                  }}
                >
                  <Clock3 size={14} /> Snooze 1 hour
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    onSnooze(reminder.id, 24 * 60);
                  }}
                >
                  <Clock3 size={14} /> Snooze 1 day
                </button>
                {onEdit && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/5"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(reminder);
                    }}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  onClick={() => {
                    setMenuOpen(false);
                    onDismiss(reminder.id);
                  }}
                >
                  <X size={14} /> Dismiss
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {active && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onComplete(reminder.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            <Check size={13} /> Complete
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSnooze(reminder.id, 60)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold disabled:opacity-60 ${
              isDarkTheme
                ? 'border-white/15 text-slate-200 hover:bg-white/10'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clock3 size={13} /> Snooze 1h
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSnooze(reminder.id, 24 * 60)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold disabled:opacity-60 ${
              isDarkTheme
                ? 'border-white/15 text-slate-200 hover:bg-white/10'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clock3 size={13} /> Snooze 1d
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDismiss(reminder.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold text-rose-600 disabled:opacity-60 ${
              isDarkTheme
                ? 'border-rose-400/30 hover:bg-rose-500/10'
                : 'border-rose-200 hover:bg-rose-50'
            }`}
          >
            <X size={13} /> Dismiss
          </button>
        </div>
      )}
    </article>
  );
};

export default ReminderCard;
