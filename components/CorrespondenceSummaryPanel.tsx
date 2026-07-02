import React from 'react';
import type { CorrespondenceProjectSummary } from '../types';
import { getCorrespondenceProgressTextTone } from '../utils/correspondence';
import { DASHBOARD_CORRESPONDENCE_PARTY_TITLE_CLASS, DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondenceSummaryPanelProps {
  summary: CorrespondenceProjectSummary | null;
}

const CorrespondenceSummaryPanel: React.FC<CorrespondenceSummaryPanelProps> = ({ summary }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  if (!summary) {
    return (
      <div className={`rounded-xl border border-dashed p-4 text-center ${themeClasses.border}`}>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
          No project totals available
        </p>
      </div>
    );
  }

  const renderBlock = (heading: string, party: CorrespondenceProjectSummary['client']) => {
    const rows = [
      ['Total Received', party.correspondenceReceived.toLocaleString('en-IN'), themeClasses.textPrimary],
      ['Total Delivered', party.correspondenceDelivered.toLocaleString('en-IN'), 'text-emerald-500'],
      ['Total Pending', party.pendingCorrespondence.toLocaleString('en-IN'), 'text-orange-500'],
      ['Overall Efficiency', `${party.deliveryEfficiency.toFixed(2)}%`, getCorrespondenceProgressTextTone(party.deliveryEfficiency)],
    ] as const;

    return (
      <div>
        <h5 className={`mb-2 text-[9px] font-semibold uppercase tracking-wide ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`}>{heading}</h5>
        <dl className="space-y-2">
          {rows.map(([label, value, accent]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-[11px]">
              <dt className={`font-bold uppercase tracking-wide ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>{label}</dt>
              <dd className={`font-black tabular-nums ${accent}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  return (
    <div className={`rounded-xl border p-4 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
      <h4 className={`mb-4 ${DASHBOARD_CORRESPONDENCE_PARTY_TITLE_CLASS}`}>
        Project Totals
      </h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {renderBlock('Client Totals', summary.client)}
        {renderBlock('Contractor Totals', summary.contractor)}
      </div>
    </div>
  );
};

export default React.memo(CorrespondenceSummaryPanel);
