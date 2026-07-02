import React from 'react';
import { AlertCircle, CheckCircle2, Percent, Send } from 'lucide-react';
import type { DrawingMonthlyRecord } from '../types';
import {
  drawingTrackingBadgeClasses,
  getApprovalRateTextTone,
  getApprovalRateTone,
  getDrawingTrackingStatus,
} from '../utils/drawingSummary';
import DrawingKpiCard from './DrawingKpiCard';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';
import { STATUS_DASHBOARD_VALUE } from '../utils/dashboardSemanticColors';

interface DrawingCompactSummaryProps {
  record: DrawingMonthlyRecord;
}

const DrawingCompactSummary: React.FC<DrawingCompactSummaryProps> = ({ record }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const rate = Math.min(100, Math.max(0, record.approvalRate));
  const tracking = getDrawingTrackingStatus(rate);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DrawingKpiCard
          variant="compact"
          label="Submitted"
          value={record.submittedDrawings}
          accent={STATUS_DASHBOARD_VALUE.neutral}
          icon={<Send size={14} className={STATUS_DASHBOARD_VALUE.neutral} />}
        />
        <DrawingKpiCard
          variant="compact"
          label="Approved"
          value={record.approvedDrawings}
          accent={STATUS_DASHBOARD_VALUE.positive}
          icon={<CheckCircle2 size={14} className={STATUS_DASHBOARD_VALUE.positive} />}
        />
        <DrawingKpiCard
          variant="compact"
          label="Variance"
          value={record.variance}
          accent={STATUS_DASHBOARD_VALUE.warning}
          icon={<AlertCircle size={14} className={STATUS_DASHBOARD_VALUE.warning} />}
        />
        <DrawingKpiCard
          variant="compact"
          label="Approval Rate"
          value={`${rate.toFixed(1)}%`}
          accent={getApprovalRateTextTone(rate)}
          icon={<Percent size={14} className={getApprovalRateTextTone(rate)} />}
        />
      </div>

      <div
        className={`rounded-xl border px-4 py-4 ${
          isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
        }`}
      >
        <p className={`text-center text-[2.25rem] font-black tabular-nums leading-none sm:text-5xl ${getApprovalRateTextTone(rate)}`}>
          {rate.toFixed(1)}%
        </p>
        <p className={`mt-1 text-center ${typo.labelBold} ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>
          Approval Rate
        </p>
        <div className="mt-2 flex justify-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${drawingTrackingBadgeClasses[tracking.level]}`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-80" aria-hidden />
            {tracking.label}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div
            className={`relative h-2.5 flex-1 overflow-hidden rounded-full ${isDarkTheme ? 'bg-slate-700/60' : 'bg-slate-200'}`}
          >
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${getApprovalRateTone(rate)}`}
              style={{ width: `${rate}%` }}
            />
          </div>
          <span className={`shrink-0 text-[10px] font-bold tabular-nums ${themeClasses.textMuted}`}>
            {rate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DrawingCompactSummary);
