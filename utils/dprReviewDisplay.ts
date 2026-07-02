export type ActivityProgressBucket = 'completed' | 'in_progress' | 'delayed';
export type StatusCardTone = 'good' | 'pending' | 'critical' | 'neutral';

export function toSafeDprNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getProgressTone(pct: number, isDark: boolean): { bar: string; text: string } {
  if (pct <= 30) {
    return {
      bar: 'bg-rose-600',
      text: isDark ? 'text-rose-300' : 'text-rose-600',
    };
  }
  if (pct <= 70) {
    return {
      bar: 'bg-amber-500',
      text: isDark ? 'text-amber-300' : 'text-amber-600',
    };
  }
  return {
    bar: 'bg-emerald-600',
    text: isDark ? 'text-emerald-300' : 'text-emerald-600',
  };
}

export function classifyActivity(activity: {
  status?: string;
  progress_percentage?: number | string;
}): ActivityProgressBucket {
  const status = (activity.status || '').toLowerCase();
  const progress = toSafeDprNumber(activity.progress_percentage);
  if (status.includes('complete') || progress >= 71) return 'completed';
  if (status.includes('delay') || progress <= 30) return 'delayed';
  return 'in_progress';
}

export function countActivityStats(
  activities: { status?: string; progress_percentage?: number | string }[]
) {
  const stats = { total: activities.length, completed: 0, in_progress: 0, delayed: 0 };
  for (const activity of activities) {
    const bucket = classifyActivity(activity);
    if (bucket === 'completed') stats.completed += 1;
    else if (bucket === 'delayed') stats.delayed += 1;
    else stats.in_progress += 1;
  }
  return stats;
}

export function getStatusFieldTone(field: string): StatusCardTone {
  switch (field) {
    case 'quality_status':
      return 'good';
    case 'pending_letters':
    case 'next_day_incident':
      return 'pending';
    case 'unresolved_issues':
      return 'critical';
    default:
      return 'neutral';
  }
}

export function statusCardClass(tone: StatusCardTone, isDarkTheme: boolean): string {
  const map: Record<StatusCardTone, string> = {
    good: isDarkTheme
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : 'border-emerald-200 bg-emerald-50',
    pending: isDarkTheme
      ? 'border-amber-500/30 bg-amber-500/10'
      : 'border-amber-200 bg-amber-50',
    critical: isDarkTheme
      ? 'border-rose-500/30 bg-rose-500/10'
      : 'border-rose-200 bg-rose-50',
    neutral: isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50',
  };
  return map[tone];
}

export function formatDprDateTime(value?: string): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}
