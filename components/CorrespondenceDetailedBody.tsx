import React from 'react';
import type {
  CorrespondenceDocument,
  CorrespondenceMonthlyPeriod,
  CorrespondenceProjectSummary,
} from '../types';
import CorrespondencePartyDashboard from './CorrespondencePartyDashboard';
import CorrespondenceSummaryPanel from './CorrespondenceSummaryPanel';
import CorrespondenceTrendChart from './CorrespondenceTrendChart';
import CorrespondenceDocumentsTable from './CorrespondenceDocumentsTable';
import { Icons } from './Icons';
import { filterCorrespondenceDocuments, monthYearLabel, sortCorrespondenceDocumentsByLatestUpdated } from '../utils/correspondence';
import { getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondenceDetailedBodyProps {
  period: CorrespondenceMonthlyPeriod;
  projectSummary: CorrespondenceProjectSummary | null;
  yearPeriods: CorrespondenceMonthlyPeriod[];
  selectedYear: number;
  selectedMonth: number;
  documents: CorrespondenceDocument[];
  isLoading?: boolean;
  onEditDocument?: (document: CorrespondenceDocument) => void;
  onDeleteDocument?: (document: CorrespondenceDocument) => void;
  onAddDocument?: (type: 'CLIENT' | 'CONTRACTOR') => void;
}

const CorrespondenceDetailedBody: React.FC<CorrespondenceDetailedBodyProps> = ({
  period,
  projectSummary,
  yearPeriods,
  selectedYear,
  selectedMonth,
  documents,
  isLoading = false,
  onEditDocument,
  onDeleteDocument,
  onAddDocument,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const monthYearText = monthYearLabel(selectedMonth, selectedYear);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2 xl:items-stretch">
        <CorrespondencePartyDashboard
          partyLabel="Client"
          correspondenceType="CLIENT"
          metrics={period.client}
          documents={documents}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          split
        />

        <CorrespondencePartyDashboard
          partyLabel="Contractor"
          correspondenceType="CONTRACTOR"
          metrics={period.contractor}
          documents={documents}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          split
        />
      </div>

      <div
        className={`space-y-3 rounded-xl border p-4 ${
          isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-black uppercase tracking-widest text-blue-600">
            All Documents — {monthYearText}
          </h4>
          {onAddDocument && (
            <button
              type="button"
              onClick={() => onAddDocument('CLIENT')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700"
            >
              <Icons.Add size={12} />
              Add Document
            </button>
          )}
        </div>
        <CorrespondenceDocumentsTable
          variant="dashboard"
          showTypeColumn
          documents={sortCorrespondenceDocumentsByLatestUpdated(
            filterCorrespondenceDocuments(documents, {
              month: selectedMonth,
              year: selectedYear,
            }),
          )}
          isLoading={isLoading}
          onEdit={onEditDocument}
          onDelete={onDeleteDocument}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CorrespondenceSummaryPanel summary={projectSummary} />
        <CorrespondenceTrendChart periods={yearPeriods} year={selectedYear} />
      </div>
    </div>
  );
};

export default React.memo(CorrespondenceDetailedBody);
