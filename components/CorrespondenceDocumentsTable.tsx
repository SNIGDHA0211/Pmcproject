import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { CorrespondenceDocument, CorrespondenceType } from '../types';
import {
  correspondenceTypeLabel,
  getCorrespondenceStatusPillClass,
  getCorrespondenceTypePillClass,
  formatCorrespondenceDisplayDate,
  formatCorrespondenceDocumentStatus,
  resolveCorrespondenceDocumentStatus,
} from '../utils/correspondence';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import { DASHBOARD_CORRESPONDENCE_TABLE_HEADER_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondenceDocumentsTableProps {
  documents: CorrespondenceDocument[];
  isLoading?: boolean;
  onEdit?: (document: CorrespondenceDocument) => void;
  onDelete?: (document: CorrespondenceDocument) => void;
  compact?: boolean;
  showTypeColumn?: boolean;
  variant?: 'default' | 'dashboard';
  maxRows?: number;
  totalCount?: number;
}

const CorrespondenceDocumentsTable: React.FC<CorrespondenceDocumentsTableProps> = ({
  documents,
  isLoading = false,
  onEdit,
  onDelete,
  compact = false,
  showTypeColumn = false,
  variant = 'default',
  maxRows,
  totalCount,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const isDashboard = variant === 'dashboard';

  const visibleDocuments = maxRows ? documents.slice(0, maxRows) : documents;
  const displayTotal = totalCount ?? documents.length;

  if (isLoading) {
    return (
      <div
        className={`${compact ? 'h-24' : 'h-32'} animate-pulse rounded-xl ${themeClasses.bgSecondary}`}
        aria-label="Loading correspondence documents"
      />
    );
  }

  if (documents.length === 0) {
    return (
      <p
        className={`rounded-xl border border-dashed px-3 py-4 text-center ${typo.empty} ${themeClasses.border} ${themeClasses.textMuted}`}
      >
        No documents for this period
      </p>
    );
  }

  const cellClass = isDashboard && compact
    ? `px-2.5 py-2 text-xs sm:text-sm font-semibold`
    : isDashboard
      ? `px-3 py-3 sm:px-5 sm:py-3.5 ${typo.body} font-semibold`
      : compact
        ? `px-2 py-2 ${typo.caption} font-semibold`
        : `px-3 py-2.5 ${typo.tableCell} font-semibold`;

  const renderTypePill = (type: CorrespondenceType) => (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 ${compact && isDashboard ? 'text-[10px] sm:text-xs' : typo.badge} ${getCorrespondenceTypePillClass(type, isDarkTheme)}`}
    >
      {correspondenceTypeLabel(type)}
    </span>
  );

  const renderStatusPill = (doc: CorrespondenceDocument) => {
    const kind = resolveCorrespondenceDocumentStatus(doc);
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 ${compact && isDashboard ? 'text-[10px] sm:text-xs' : typo.badge} ${getCorrespondenceStatusPillClass(kind, isDarkTheme)}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
        {formatCorrespondenceDocumentStatus(doc)}
      </span>
    );
  };

  return (
    <div className="space-y-2">
      {/* Mobile card list */}
      {isDashboard && (
        <div className={`space-y-1.5 md:hidden ${compact ? '' : 'space-y-2'}`}>
          {visibleDocuments.map((doc) => (
            <div
              key={doc.id ?? `${doc.correspondenceType}-${doc.srNo}-${doc.receivedDate}`}
              className={`rounded-lg border ${compact ? 'p-2' : 'p-3'} ${
                isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className={`text-xs font-bold tabular-nums ${themeClasses.textMuted}`}>#{doc.srNo}</span>
                  {(showTypeColumn || isDashboard) && renderTypePill(doc.correspondenceType)}
                  {renderStatusPill(doc)}
                </div>
                {(onEdit || onDelete) && (
                  <div className="flex shrink-0 items-center gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(doc)}
                        className={`rounded-lg p-1.5 ${isDarkTheme ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'}`}
                        title="Edit document"
                        aria-label="Edit document"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {onDelete && doc.id != null && (
                      <button
                        type="button"
                        onClick={() => onDelete(doc)}
                        className={`rounded-lg p-1.5 ${isDarkTheme ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'}`}
                        title="Delete document"
                        aria-label="Delete document"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className={`mb-2 text-sm font-semibold leading-snug ${themeClasses.textPrimary}`}>{doc.description}</p>
              <div className="grid grid-cols-1 gap-1.5 min-[360px]:grid-cols-3">
                {[
                  ['Received', formatCorrespondenceDisplayDate(doc.receivedDate)],
                  ['Deadline', formatCorrespondenceDisplayDate(doc.deadlineDate)],
                  ['Delivered', formatCorrespondenceDisplayDate(doc.deliveredDate)],
                ].map(([label, value]) => (
                  <div key={label} className={`rounded-lg px-2 py-1.5 ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <p className={`text-[9px] font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>{label}</p>
                    <p className={`text-xs font-semibold tabular-nums ${themeClasses.textSecondary}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <div
        className={`overflow-x-auto rounded-xl border ${
          isDashboard ? 'hidden md:block' : ''
        } ${
          isDashboard
            ? isDarkTheme
              ? 'border-white/10 bg-slate-900/50'
              : 'border-slate-200 bg-white'
            : isDarkTheme
              ? 'border-white/10'
              : 'border-slate-200'
        }`}
      >
        <table className={`border-collapse text-left ${isDashboard ? 'min-w-[720px] w-full' : 'min-w-full w-full'}`}>
          <thead className={isDarkTheme ? 'bg-white/[0.06]' : 'bg-slate-50'}>
            <tr>
              {[
                'Sr No',
                ...(showTypeColumn || isDashboard ? ['Type'] : []),
                'Description',
                'Received Date',
                'Deadline Date',
                'Delivered Date',
                'Status',
                ...(onEdit || onDelete ? ['Actions'] : []),
              ].map((heading) => {
                const isActions = heading === 'Actions';
                return (
                  <th
                    key={heading}
                    className={`${cellClass} ${typo.labelBold} ${DASHBOARD_CORRESPONDENCE_TABLE_HEADER_CLASS(isDarkTheme)} ${
                      isActions ? 'w-[5.5rem] text-center' : ''
                    }`}
                  >
                    {heading}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleDocuments.map((doc) => (
              <tr
                key={doc.id ?? `${doc.correspondenceType}-${doc.srNo}-${doc.receivedDate}`}
                className={`border-t transition-colors ${
                  isDarkTheme ? 'border-white/10 hover:bg-white/[0.04]' : 'border-slate-100 hover:bg-slate-50/80'
                }`}
              >
                <td className={`${cellClass} tabular-nums ${themeClasses.textPrimary}`}>{doc.srNo}</td>
                {(showTypeColumn || isDashboard) && (
                  <td className={cellClass}>{renderTypePill(doc.correspondenceType)}</td>
                )}
                <td className={`${cellClass} max-w-[220px] ${themeClasses.textPrimary}`}>
                  <span className="line-clamp-2">{doc.description}</span>
                </td>
                <td className={`${cellClass} whitespace-nowrap ${themeClasses.textSecondary}`}>
                  {formatCorrespondenceDisplayDate(doc.receivedDate)}
                </td>
                <td className={`${cellClass} whitespace-nowrap ${themeClasses.textSecondary}`}>
                  {formatCorrespondenceDisplayDate(doc.deadlineDate)}
                </td>
                <td className={`${cellClass} whitespace-nowrap ${themeClasses.textSecondary}`}>
                  {formatCorrespondenceDisplayDate(doc.deliveredDate)}
                </td>
                <td className={cellClass}>{renderStatusPill(doc)}</td>
                {(onEdit || onDelete) && (
                  <td className={`${cellClass} w-[5.5rem] whitespace-nowrap text-center`}>
                    <div className="mx-auto flex w-fit items-center justify-center gap-1.5">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(doc)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            isDarkTheme
                              ? 'text-blue-400 hover:bg-blue-500/10'
                              : 'text-blue-600 hover:bg-blue-50'
                          }`}
                          title="Edit document"
                          aria-label="Edit document"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {onDelete && doc.id != null && (
                        <button
                          type="button"
                          onClick={() => onDelete(doc)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            isDarkTheme
                              ? 'text-rose-400 hover:bg-rose-500/10'
                              : 'text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Delete document"
                          aria-label="Delete document"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {maxRows != null && displayTotal > maxRows && (
        <p className={`text-center text-xs font-semibold sm:text-sm ${themeClasses.textMuted}`}>
          Showing {visibleDocuments.length} of {displayTotal} documents
        </p>
      )}
    </div>
  );
};

export default React.memo(CorrespondenceDocumentsTable);
