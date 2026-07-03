import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, ShieldPlus, X } from 'lucide-react';
import type { BGEntry } from '../../types/bgStatus';
import { ModalPortal } from '../ModalPortal';
import {
  bgStatusLabel,
  bgStatusToneClasses,
  derivePartyBgPill,
  formatBgDisplayDate,
  pickLatestUpdatedBgEntry,
  shortBgName,
  sortBgEntriesForDisplay,
  summarizeBgEntries,
} from '../../utils/bgStatusDisplay';

interface ScheduleBgStripProps {
  entries: BGEntry[];
  isDarkTheme: boolean;
  party?: 'SCL' | 'CONTRACTOR';
  partyTitle?: string;
  onManageBg?: () => void;
  hideWhenEmpty?: boolean;
}

const sectionTitle = (party?: 'SCL' | 'CONTRACTOR') => {
  if (party === 'SCL') return 'SCL Bank Guarantee';
  if (party === 'CONTRACTOR') return 'Contractor Bank Guarantee';
  return 'Bank Guarantees';
};

const BgDetailRow: React.FC<{ entry: BGEntry; isDarkTheme: boolean }> = ({
  entry,
  isDarkTheme,
}) => {
  const tone = bgStatusToneClasses(entry.status, isDarkTheme);

  return (
    <div
      className={`rounded-xl border p-3 ${
        isDarkTheme ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <ShieldCheck
            size={14}
            className={`mt-0.5 shrink-0 ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`}
          />
          <p className={`text-sm font-bold leading-snug ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
            {entry.bg_name}
          </p>
        </div>
        <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${tone}`}>
          {bgStatusLabel(entry.status)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-2">
        <div className={`rounded-lg px-2.5 py-2 ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
          <p className={`text-[10px] font-bold uppercase ${isDarkTheme ? 'text-white/45' : 'text-slate-400'}`}>
            Due date
          </p>
          <p className={`mt-0.5 font-semibold tabular-nums ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
            {entry.due_date?.trim() ? formatBgDisplayDate(entry.due_date) : '—'}
          </p>
        </div>
        <div className={`rounded-lg px-2.5 py-2 ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
          <p className={`text-[10px] font-bold uppercase ${isDarkTheme ? 'text-white/45' : 'text-slate-400'}`}>
            Updated
          </p>
          <p className={`mt-0.5 font-semibold tabular-nums ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
            {entry.updated_date?.trim() ? formatBgDisplayDate(entry.updated_date) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
};

const ScheduleBgDetailsModal: React.FC<{
  open: boolean;
  onClose: () => void;
  entries: BGEntry[];
  isDarkTheme: boolean;
  partyTitle: string;
  onManageBg?: () => void;
}> = ({ open, onClose, entries, isDarkTheme, partyTitle, onManageBg }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const panel = isDarkTheme
    ? 'border-white/10 bg-[#0f172a] text-white'
    : 'border-slate-200 bg-white text-slate-900';

  const sorted = sortBgEntriesForDisplay(entries);

  return (
    <ModalPortal open={open}>
      <div
        className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        role="presentation"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bg-details-title"
          className={`flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:rounded-2xl ${panel}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${
              isDarkTheme ? 'border-white/10' : 'border-slate-100'
            }`}
          >
            <div className="min-w-0">
              <h3 id="bg-details-title" className="truncate text-base font-bold">
                {partyTitle}
              </h3>
              <p className={`truncate text-xs ${isDarkTheme ? 'text-white/55' : 'text-slate-500'}`}>
                {entries.length} record{entries.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg p-2 transition-colors ${
                isDarkTheme ? 'text-white/60 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'
              }`}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <div className="space-y-2.5">
              {sorted.map((entry) => (
                <BgDetailRow key={entry.id} entry={entry} isDarkTheme={isDarkTheme} />
              ))}
            </div>
          </div>

          <div
            className={`flex flex-col-reverse gap-2 border-t px-4 py-3 sm:flex-row sm:justify-end ${
              isDarkTheme ? 'border-white/10' : 'border-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors ${
                isDarkTheme
                  ? 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Close
            </button>
            {onManageBg && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onManageBg();
                }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                <ShieldPlus size={15} />
                Manage BG
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

const BgInlineRow: React.FC<{ entry: BGEntry; isDarkTheme: boolean; highlight?: boolean }> = ({
  entry,
  isDarkTheme,
  highlight = false,
}) => {
  const tone = bgStatusToneClasses(entry.status, isDarkTheme);
  const statusLabel = bgStatusLabel(entry.status);
  const dateLabel =
    entry.updated_date?.trim()
      ? `Updated ${formatBgDisplayDate(entry.updated_date)}`
      : entry.due_date?.trim()
        ? `Due ${formatBgDisplayDate(entry.due_date)}`
        : 'Due —';

  return (
    <div
      className={`rounded-md border px-2.5 py-2 ${
        highlight
          ? isDarkTheme
            ? 'border-indigo-500/25 bg-indigo-500/10'
            : 'border-indigo-200 bg-indigo-50/60'
          : isDarkTheme
            ? 'border-white/10 bg-white/[0.02]'
            : 'border-slate-200/80 bg-white'
      }`}
      title={entry.bg_name}
    >
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <ShieldCheck
            size={12}
            strokeWidth={2.5}
            className={`mt-0.5 shrink-0 ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`}
          />
          <div className="min-w-0 flex-1">
            {highlight && (
              <p
                className={`mb-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  isDarkTheme ? 'text-indigo-300/80' : 'text-indigo-600'
                }`}
              >
                Latest update
              </p>
            )}
            <p
              className={`text-[10px] font-semibold leading-snug sm:text-[11px] ${
                isDarkTheme ? 'text-white/90' : 'text-slate-800'
              }`}
            >
              <span className="line-clamp-2 sm:truncate">{shortBgName(entry.bg_name, 48)}</span>
            </p>
            <p
              className={`mt-0.5 text-[9px] font-medium tabular-nums sm:hidden ${
                isDarkTheme ? 'text-white/50' : 'text-slate-500'
              }`}
            >
              {dateLabel}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
          <span
            className={`hidden text-[9px] font-medium tabular-nums sm:inline ${
              isDarkTheme ? 'text-white/50' : 'text-slate-500'
            }`}
          >
            {dateLabel}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase leading-none ${tone}`}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

const BgSummaryCounts: React.FC<{ entries: BGEntry[]; isDarkTheme: boolean }> = ({
  entries,
  isDarkTheme,
}) => {
  const stats = summarizeBgEntries(entries);
  if (stats.total === 0) return null;

  const parts: string[] = [];
  if (stats.updated > 0) parts.push(`${stats.updated} updated`);
  if (stats.notUpdated > 0) parts.push(`${stats.notUpdated} not updated`);
  if (stats.yetToUpdate > 0) parts.push(`${stats.yetToUpdate} pending`);

  if (parts.length === 0) return null;

  return (
    <p className={`text-[10px] font-medium ${isDarkTheme ? 'text-white/50' : 'text-slate-500'}`}>
      {parts.join(' · ')}
    </p>
  );
};

const ScheduleBgStrip: React.FC<ScheduleBgStripProps> = ({
  entries,
  isDarkTheme,
  party,
  partyTitle = 'Schedule',
  onManageBg,
  hideWhenEmpty = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const sortedEntries = useMemo(() => sortBgEntriesForDisplay(entries), [entries]);
  const latestEntry = useMemo(() => pickLatestUpdatedBgEntry(entries), [entries]);
  const summary = useMemo(() => derivePartyBgPill(entries), [entries]);
  const partyLabel = party === 'SCL' ? 'SCL' : party === 'CONTRACTOR' ? 'Contractor' : partyTitle;
  const title = sectionTitle(party);

  useEffect(() => {
    setExpanded(false);
  }, [entries]);

  const manageBtn = onManageBg ? (
    <button
      type="button"
      onClick={onManageBg}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
        isDarkTheme
          ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10'
          : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
      }`}
    >
      <ShieldPlus size={11} />
      BG
    </button>
  ) : null;

  const shellClass = `rounded-lg border px-2.5 py-2.5 sm:px-3 ${
    isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'
  }`;

  if (!entries.length) {
    if (hideWhenEmpty) return null;
    return (
      <div className={`flex items-center justify-between gap-2 ${shellClass}`}>
        <div className="min-w-0">
          <p
            className={`text-[10px] font-bold uppercase tracking-wide ${
              isDarkTheme ? 'text-white/55' : 'text-slate-600'
            }`}
          >
            {title}
          </p>
          <p className={`text-[10px] ${isDarkTheme ? 'text-white/40' : 'text-slate-400'}`}>
            No records — use Manage BG to add
          </p>
        </div>
        {manageBtn}
      </div>
    );
  }

  const overallTone = bgStatusToneClasses(summary.status, isDarkTheme);
  const hasMultiple = entries.length > 1;
  const visibleEntries = expanded
    ? sortedEntries
    : latestEntry
      ? [latestEntry]
      : sortedEntries.slice(0, 1);

  const toggleBtn = hasMultiple ? (
    <button
      type="button"
      onClick={() => setExpanded((open) => !open)}
      aria-expanded={expanded}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
        isDarkTheme
          ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
      }`}
    >
      {expanded ? (
        <>
          <ChevronUp size={12} />
          Show less
        </>
      ) : (
        <>
          <ChevronDown size={12} />
          Show all ({entries.length})
        </>
      )}
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setDetailsOpen(true)}
      className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
        isDarkTheme
          ? 'text-indigo-300 hover:bg-indigo-500/10'
          : 'text-indigo-700 hover:bg-indigo-50'
      }`}
    >
      Details
    </button>
  );

  return (
    <>
      <div className={`flex h-full flex-col gap-2 ${shellClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  isDarkTheme ? 'text-white/55' : 'text-slate-600'
                }`}
              >
                {title}
              </p>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${overallTone}`}
              >
                {entries.length} total
              </span>
            </div>
            <BgSummaryCounts entries={entries} isDarkTheme={isDarkTheme} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {toggleBtn}
            {manageBtn}
          </div>
        </div>

        <div
          className={`flex flex-col gap-1 ${expanded && hasMultiple ? 'max-h-48 overflow-y-auto pr-0.5 sm:max-h-56' : ''}`}
        >
          {visibleEntries.map((entry) => (
            <BgInlineRow
              key={entry.id}
              entry={entry}
              isDarkTheme={isDarkTheme}
              highlight={!expanded && entry.id === latestEntry?.id}
            />
          ))}
        </div>

        {expanded && hasMultiple && (
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className={`w-full rounded-md py-1 text-center text-[10px] font-bold uppercase tracking-wide transition-colors ${
              isDarkTheme
                ? 'text-indigo-300 hover:bg-indigo-500/10'
                : 'text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            Open full details
          </button>
        )}
      </div>

      <ScheduleBgDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        entries={sortedEntries}
        isDarkTheme={isDarkTheme}
        partyTitle={partyTitle || partyLabel}
        onManageBg={onManageBg}
      />
    </>
  );
};

export default ScheduleBgStrip;
