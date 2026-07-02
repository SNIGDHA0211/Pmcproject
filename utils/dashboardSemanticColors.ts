/**
 * Enterprise dashboard semantic colors — single source of truth.
 * Green = positive | Red = negative/critical | Orange = warning | Dark gray = neutral financial
 * Blue reserved for titles, navigation, and interactive controls only.
 */

export const SEMANTIC_HEX = {
  positive: '#059669',
  negative: '#E11D48',
  neutral: '#1E293B',
  warning: '#EA580C',
} as const;

export type DashboardSemanticTone = 'positive' | 'negative' | 'warning' | 'neutral';

/** KPI value text classes (light mode uses exact brand hex) */
export function semanticValueClass(tone: DashboardSemanticTone, isDark = false): string {
  switch (tone) {
    case 'positive':
      return isDark ? 'text-emerald-400' : 'text-[#059669]';
    case 'negative':
      return isDark ? 'text-rose-400' : 'text-[#E11D48]';
    case 'warning':
      return isDark ? 'text-orange-400' : 'text-orange-600';
    case 'neutral':
      return isDark ? 'text-slate-200' : 'text-[#1E293B]';
  }
}

export function semanticBorderAccentClass(tone: DashboardSemanticTone): string {
  switch (tone) {
    case 'positive':
      return 'border-b-[#059669]';
    case 'negative':
      return 'border-b-[#E11D48]';
    case 'warning':
      return 'border-b-orange-500';
    case 'neutral':
      return 'border-b-slate-400';
  }
}

export function semanticBarFillClass(tone: DashboardSemanticTone): string {
  switch (tone) {
    case 'positive':
      return 'bg-[#059669]';
    case 'negative':
      return 'bg-[#E11D48]';
    case 'warning':
      return 'bg-orange-500';
    case 'neutral':
      return 'bg-slate-400';
  }
}

export function semanticBadgeClass(tone: DashboardSemanticTone, isDark = false): string {
  switch (tone) {
    case 'positive':
      return isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-[#047857]';
    case 'negative':
      return isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-[#BE123C]';
    case 'warning':
      return isDark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-700';
    case 'neutral':
      return isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600';
  }
}

export function semanticIconWrapClass(tone: DashboardSemanticTone, isDark = false): string {
  return semanticBadgeClass(tone, isDark);
}

export function semanticDotClass(tone: DashboardSemanticTone): string {
  switch (tone) {
    case 'positive':
      return 'bg-[#059669]';
    case 'negative':
      return 'bg-[#E11D48]';
    case 'warning':
      return 'bg-orange-500';
    case 'neutral':
      return 'bg-slate-400';
  }
}

/** Certification / collection efficiency thresholds */
export function getCertificationSemanticTone(pct: number): DashboardSemanticTone {
  if (pct >= 80) return 'positive';
  if (pct >= 70) return 'warning';
  return 'negative';
}

export function getCertificationStatusLabel(pct: number): string {
  if (pct >= 90) return 'Excellent';
  if (pct >= 80) return 'Good';
  if (pct >= 70) return 'Needs Attention';
  return 'Critical';
}

/** Contract value growth — positive growth is always green */
export function getGrowthSemanticTone(pct: number): DashboardSemanticTone {
  if (pct < 0) return 'negative';
  return 'positive';
}

/** Performance highlight card metric value classes (light-mode defaults) */
export const KPI_METRIC_COLORS = {
  primary: 'text-[#1E293B]',
  positive: 'text-[#059669]',
  negative: 'text-[#E11D48]',
  muted: 'text-slate-400',
} as const;

export function kpiMetricColor(
  kind: keyof typeof KPI_METRIC_COLORS,
  isDark = false
): string {
  if (kind === 'muted') return KPI_METRIC_COLORS.muted;
  if (kind === 'primary') return semanticValueClass('neutral', isDark);
  if (kind === 'positive') return semanticValueClass('positive', isDark);
  return semanticValueClass('negative', isDark);
}

/** Status badge backgrounds aligned with semantic tones */
export function performanceStatusBadgeClass(
  tone: 'success' | 'warning' | 'attention' | 'moderate' | 'danger',
  isDark = false
): string {
  switch (tone) {
    case 'success':
      return semanticBadgeClass('positive', isDark);
    case 'warning':
    case 'moderate':
      return semanticBadgeClass('warning', isDark);
    case 'attention':
    case 'danger':
      return semanticBadgeClass('negative', isDark);
  }
}

export function performanceBarFillClass(
  tone: 'success' | 'warning' | 'attention' | 'moderate' | 'danger'
): string {
  switch (tone) {
    case 'success':
      return semanticBarFillClass('positive');
    case 'warning':
    case 'moderate':
      return semanticBarFillClass('warning');
    case 'attention':
    case 'danger':
      return semanticBarFillClass('negative');
  }
}

/** HSE, Quality, and Drawings status dashboard sections */
export type StatusDashboardTone = 'positive' | 'warning' | 'negative' | 'neutral';

export const STATUS_DASHBOARD_HEX = {
  label: '#475569',
  positive: '#059669',
  warning: '#F97316',
  negative: '#E11D48',
  neutral: '#2563EB',
} as const;

/** Metric card labels — darker neutral for readability */
export function statusDashboardLabelClass(isDark = false): string {
  return isDark ? 'text-slate-400' : 'text-[#475569]';
}

/** KPI value colors for status dashboard sections */
export function statusDashboardValueClass(tone: StatusDashboardTone, isDark = false): string {
  switch (tone) {
    case 'positive':
      return isDark ? 'text-emerald-400' : 'text-[#059669]';
    case 'warning':
      return isDark ? 'text-orange-400' : 'text-[#F97316]';
    case 'negative':
      return isDark ? 'text-rose-400' : 'text-[#E11D48]';
    case 'neutral':
      return isDark ? 'text-blue-400' : 'text-[#2563EB]';
  }
}

/** Light-mode value classes for accent props */
export const STATUS_DASHBOARD_VALUE = {
  positive: 'text-[#059669]',
  warning: 'text-[#F97316]',
  negative: 'text-[#E11D48]',
  neutral: 'text-[#2563EB]',
} as const;
