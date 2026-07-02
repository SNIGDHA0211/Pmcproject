import React from 'react';
import { AlertCircle, CheckCircle2, Percent, Send } from 'lucide-react';
import type { DrawingMonthlyRecord, DrawingProjectSummary as DrawingProjectSummaryData } from '../types';
import DrawingKpiCard from './DrawingKpiCard';
import DrawingApprovalChart from './DrawingApprovalChart';
import DrawingApprovalProgress from './DrawingApprovalProgress';
import DrawingProjectSummary from './DrawingProjectSummary';
import DrawingTrendChart from './DrawingTrendChart';
import { getApprovalRateTextTone } from '../utils/drawingSummary';
import { STATUS_DASHBOARD_VALUE } from '../utils/dashboardSemanticColors';

interface DrawingDetailedBodyProps {
  monthlyRecord: DrawingMonthlyRecord;
  projectSummary: DrawingProjectSummaryData | null;
  yearRecords: DrawingMonthlyRecord[];
  selectedYear: number;
}

const DrawingDetailedBody: React.FC<DrawingDetailedBodyProps> = ({
  monthlyRecord,
  projectSummary,
  yearRecords,
  selectedYear,
}) => {
  const rate = monthlyRecord.approvalRate;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <DrawingKpiCard
          variant="icon"
          label="Submitted"
          value={monthlyRecord.submittedDrawings}
          accent={STATUS_DASHBOARD_VALUE.neutral}
          icon={<Send size={20} className={STATUS_DASHBOARD_VALUE.neutral} />}
        />
        <DrawingKpiCard
          variant="icon"
          label="Approved"
          value={monthlyRecord.approvedDrawings}
          accent={STATUS_DASHBOARD_VALUE.positive}
          icon={<CheckCircle2 size={20} className={STATUS_DASHBOARD_VALUE.positive} />}
        />
        <DrawingKpiCard
          variant="icon"
          label="Variance"
          value={monthlyRecord.variance}
          accent={STATUS_DASHBOARD_VALUE.warning}
          icon={<AlertCircle size={20} className={STATUS_DASHBOARD_VALUE.warning} />}
        />
        <DrawingKpiCard
          variant="icon"
          label="Approval Rate"
          value={`${rate.toFixed(1)}%`}
          accent={getApprovalRateTextTone(rate)}
          icon={<Percent size={20} className={getApprovalRateTextTone(rate)} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DrawingApprovalChart
          submitted={monthlyRecord.submittedDrawings}
          approved={monthlyRecord.approvedDrawings}
          variance={monthlyRecord.variance}
        />
        <div className="flex flex-col gap-3">
          <DrawingApprovalProgress approvalRate={rate} />
          <DrawingProjectSummary summary={projectSummary} />
        </div>
      </div>

      <DrawingTrendChart records={yearRecords} year={selectedYear} />
    </div>
  );
};

export default React.memo(DrawingDetailedBody);
