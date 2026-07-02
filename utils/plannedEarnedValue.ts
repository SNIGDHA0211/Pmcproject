import type { PerformanceStatus, PerformanceStatusTone } from '../components/PerformanceHighlightCard';

export function getPlannedEarnedPerformanceStatus(performancePercentage: number): PerformanceStatus {
  if (performancePercentage >= 100) {
    return { label: 'ON TRACK', tone: 'success' };
  }
  if (performancePercentage >= 90) {
    return { label: 'AT RISK', tone: 'warning' };
  }
  return { label: 'BEHIND PLAN', tone: 'danger' };
}

export function getPlannedEarnedProgressTone(performancePercentage: number): PerformanceStatusTone {
  if (performancePercentage >= 100) return 'success';
  if (performancePercentage >= 90) return 'warning';
  return 'danger';
}

export function getPlanDeltaHelperText(performancePercentage: number): string {
  const delta = performancePercentage - 100;
  if (delta > 0.05) return `▲ ${delta.toFixed(1)}% Above Plan`;
  if (delta < -0.05) return `▼ ${Math.abs(delta).toFixed(1)}% Behind Plan`;
  return 'On Plan';
}
