import type { ReminderRecord, ReminderStatus } from '../services/remindersApi';

/** Auto-refresh interval for Reminders UI + background sync (1 minute). */
export const REMINDER_REFRESH_MS = 60_000;

export function formatReminderDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatReminderDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert datetime-local value to ISO with timezone offset. */
export function localDateTimeToIso(localValue: string): string {
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return localValue;
  return d.toISOString();
}

export function reminderPersonLabel(
  person: ReminderRecord['assigned_to'] | ReminderRecord['created_by'],
): string {
  if (!person) return '—';
  return person.full_name?.trim() || person.username?.trim() || '—';
}

export function reminderStatusLabel(status: ReminderStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'sent':
      return 'Notified';
    case 'completed':
      return 'Completed';
    case 'dismissed':
      return 'Dismissed';
    case 'snoozed':
      return 'Snoozed';
    default:
      return status;
  }
}

export function reminderStatusClasses(status: ReminderStatus, isDark: boolean): string {
  if (status === 'completed') {
    return isDark
      ? 'bg-emerald-500/20 text-emerald-300'
      : 'bg-emerald-100 text-emerald-700';
  }
  if (status === 'dismissed') {
    return isDark ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-200 text-slate-600';
  }
  if (status === 'snoozed') {
    return isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700';
  }
  if (status === 'sent') {
    return isDark ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-800';
  }
  return isDark ? 'bg-indigo-500/20 text-indigo-200' : 'bg-indigo-50 text-indigo-700';
}

export function isActiveReminder(reminder: ReminderRecord): boolean {
  return reminder.status === 'pending' || reminder.status === 'sent' || reminder.status === 'snoozed';
}

/** ISO timestamp when the alarm should fire (respects snooze). Uses due_at — not effective_due_at (backend may set that early when alert is sent). */
export function getReminderAlarmDueAt(reminder: ReminderRecord): string | null {
  const status = (reminder.status || '').toLowerCase();
  if (status === 'completed' || status === 'dismissed') return null;
  if (status === 'snoozed' && reminder.snoozed_until) {
    return reminder.snoozed_until;
  }
  return reminder.due_at || null;
}

export function getReminderAlarmDueMs(reminder: ReminderRecord): number | null {
  const dueAt = getReminderAlarmDueAt(reminder);
  if (!dueAt) return null;
  const ms = new Date(dueAt).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Alarm may fire only when clock has reached the scheduled due minute/time. */
export function isReminderAlarmTimeReached(reminder: ReminderRecord, now = Date.now()): boolean {
  const dueMs = getReminderAlarmDueMs(reminder);
  return dueMs != null && now >= dueMs;
}

export function isReminderBeforeAlarmTime(reminder: ReminderRecord, now = Date.now()): boolean {
  const dueMs = getReminderAlarmDueMs(reminder);
  return dueMs != null && now < dueMs;
}

/** True when reminder is past due (respects snooze until). */
export function isReminderStrictlyOverdue(reminder: ReminderRecord, now = Date.now()): boolean {
  const status = (reminder.status || '').toLowerCase();
  if (status === 'completed' || status === 'dismissed') return false;
  if (status === 'snoozed') {
    const until = reminder.snoozed_until || reminder.effective_due_at || reminder.due_at;
    const t = new Date(until).getTime();
    if (Number.isFinite(t) && t > now) return false;
  }
  if (reminder.is_overdue) return true;
  const due = new Date(reminder.effective_due_at || reminder.due_at).getTime();
  return Number.isFinite(due) && due < now;
}

export function groupReminders(reminders: ReminderRecord[]): {
  overdue: ReminderRecord[];
  today: ReminderRecord[];
  upcoming: ReminderRecord[];
  done: ReminderRecord[];
} {
  const overdue: ReminderRecord[] = [];
  const today: ReminderRecord[] = [];
  const upcoming: ReminderRecord[] = [];
  const done: ReminderRecord[] = [];

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  for (const item of reminders) {
    if (item.status === 'completed' || item.status === 'dismissed') {
      done.push(item);
      continue;
    }
    const due = new Date(item.effective_due_at || item.due_at);
    if (Number.isNaN(due.getTime())) {
      upcoming.push(item);
      continue;
    }
    if (isReminderStrictlyOverdue(item)) {
      overdue.push(item);
    } else if (due >= start && due < end) {
      today.push(item);
    } else {
      upcoming.push(item);
    }
  }

  return { overdue, today, upcoming, done };
}
