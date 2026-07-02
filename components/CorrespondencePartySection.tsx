import React from 'react';
import { AlertCircle, ArrowUp, Download, Shield } from 'lucide-react';
import type { CorrespondencePartyMetrics } from '../types';
import CorrespondenceKpiCard from './CorrespondenceKpiCard';
import CorrespondenceEfficiencyRing from './CorrespondenceEfficiencyRing';
import CorrespondenceProgressBar from './CorrespondenceProgressBar';
import { getCorrespondenceProgressTextTone } from '../utils/correspondence';
import { DASHBOARD_CORRESPONDENCE_PARTY_TITLE_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondencePartySectionProps {
  title: string;
  metrics: CorrespondencePartyMetrics;
  icon?: React.ReactNode;
}

const CorrespondencePartySection: React.FC<CorrespondencePartySectionProps> = ({
  title,
  metrics,
  icon,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div>
      <h4 className={`mb-3 flex items-center gap-2 ${DASHBOARD_CORRESPONDENCE_PARTY_TITLE_CLASS}`}>
        {icon}
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CorrespondenceKpiCard
          variant="icon"
          label="Received"
          value={metrics.correspondenceReceived}
          accent="text-blue-600"
          icon={<Download size={20} className="text-blue-600" />}
        />
        <CorrespondenceKpiCard
          variant="icon"
          label="Delivered"
          value={metrics.correspondenceDelivered}
          accent="text-emerald-600"
          icon={<ArrowUp size={20} className="text-emerald-600" />}
        />
        <CorrespondenceKpiCard
          variant="icon"
          label="Pending"
          value={metrics.pendingCorrespondence}
          accent="text-orange-500"
          icon={<AlertCircle size={20} className="text-orange-500" />}
        />
        <CorrespondenceKpiCard
          variant="icon"
          label="Delivery Efficiency"
          value={`${metrics.deliveryEfficiency.toFixed(2)}%`}
          accent={getCorrespondenceProgressTextTone(metrics.deliveryEfficiency)}
          icon={<Shield size={20} className={getCorrespondenceProgressTextTone(metrics.deliveryEfficiency)} />}
        />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div
          className={`flex items-center justify-center rounded-xl border px-4 py-4 ${
            isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <CorrespondenceEfficiencyRing efficiency={metrics.deliveryEfficiency} />
        </div>
        <div
          className={`flex flex-col justify-center rounded-xl border px-4 py-4 ${
            isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <CorrespondenceProgressBar efficiency={metrics.deliveryEfficiency} />
        </div>
      </div>
    </div>
  );
};

export default React.memo(CorrespondencePartySection);
