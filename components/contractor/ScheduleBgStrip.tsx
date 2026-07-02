import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldPlus, X } from 'lucide-react';
import type { BGEntry } from '../../types/bgStatus';
import { ModalPortal } from '../ModalPortal';
import {
  bgStatusLabel,
  bgStatusToneClasses,
  derivePartyBgPill,
  formatBgDisplayDate,
} from '../../utils/bgStatusDisplay';

interface ScheduleBgStripProps {
  entries: BGEntry[];
  isDarkTheme: boolean;
  partyTitle?: string;
  onManageBg?: () => void;
}

const BgDetailRow: React.FC<{ entry: BGEntry; isDarkTheme: boolean }> = ({
  entry,
  isDarkTheme,
}) => {
  const pill = derivePartyBgPill([entry]);
  const tone = bgStatusToneClasses(pill.status, isDarkTheme);
  const label = bgStatusLabel(pill.status);

  return (
    <div
      className={`rounded-xl border p-3 ${
        isDarkTheme ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <ShieldCheck size={14} className={`mt-0.5 shrink-0 ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <p className={`text-sm font-bold leading-snug ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
            {entry.bg_name}
          </p>
        </div>
        <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${tone}`}>
          {label}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div
          className={`rounded-lg px-2.5 py-2 ${
            isDarkTheme ? 'bg-white/5' : 'bg-slate-50'
          }`}
        >
          <p className={`text-[10px] font-bold uppercase ${isDarkTheme ? 'text-white/45' : 'text-slate-400'}`}>
            Due date
          </p>
          <p className={`mt-0.5 font-semibold tabular-nums ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
            {entry.due_date?.trim() ? formatBgDisplayDate(entry.due_date) : '—'}
          </p>
        </div>
        <div
          className={`rounded-lg px-2.5 py-2 ${
            isDarkTheme ? 'bg-white/5' : 'bg-slate-50'
          }`}
        >
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
                Bank Guarantees
              </h3>
              <p className={`truncate text-xs ${isDarkTheme ? 'text-white/55' : 'text-slate-500'}`}>
                {partyTitle} · {entries.length} record{entries.length === 1 ? '' : 's'}
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
              {entries.map((entry) => (
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
              Cancel
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

const BgPreviewChip: React.FC<{ entry: BGEntry; isDarkTheme: boolean }> = ({
  entry,
  isDarkTheme,
}) => {
  const pill = derivePartyBgPill([entry]);
  const tone = bgStatusToneClasses(pill.status, isDarkTheme);
  const datePrefix = pill.dateKind === 'updated' ? 'Upd' : 'Due';

  return (
    <div className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] ${tone}`}>
      <span className="max-w-[5.5rem] truncate font-semibold">{entry.bg_name}</span>
      <span className="tabular-nums opacity-90">
        {datePrefix} {pill.displayDate ? formatBgDisplayDate(pill.displayDate) : '—'}
      </span>
    </div>
  );
};

const ScheduleBgStrip: React.FC<ScheduleBgStripProps> = ({
  entries,
  isDarkTheme,
  partyTitle = 'Schedule',
  onManageBg,
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const summary = useMemo(() => derivePartyBgPill(entries), [entries]);

  const emptyTone = isDarkTheme
    ? 'border-white/10 bg-white/5 text-white/50'
    : 'border-slate-200 bg-slate-50 text-slate-500';

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

  if (!entries.length) {
    return (
      <div className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 ${emptyTone}`}>
        <span className="text-[10px] font-medium">No bank guarantee on file</span>
        {manageBtn}
      </div>
    );
  }

  const previewCount = entries.length > 3 ? 2 : Math.min(entries.length, 3);
  const previewEntries = entries.slice(0, previewCount);
  const hiddenCount = entries.length - previewEntries.length;

  return (
    <>
      <div className="flex items-stretch gap-2">
        <div
          className={`flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border px-2.5 py-1.5 sm:flex-row sm:items-center sm:gap-3 ${
            isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <div className="min-w-0">
              <p
                className={`text-[9px] font-bold uppercase tracking-wider ${
                  isDarkTheme ? 'text-white/45' : 'text-slate-400'
                }`}
              >
                Bank guarantees ({entries.length})
              </p>
              {summary.status && (
                <p
                  className={`text-[10px] font-semibold uppercase ${
                    isDarkTheme ? 'text-white/55' : 'text-slate-500'
                  }`}
                >
                  {bgStatusLabel(summary.status)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                isDarkTheme
                  ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              View all
            </button>
          </div>

          {/* Preview chips — hidden on very small screens to avoid clutter */}
          <div className="hidden min-w-0 items-center gap-1.5 overflow-x-auto sm:flex">
            {previewEntries.map((entry) => (
              <BgPreviewChip key={entry.id} entry={entry} isDarkTheme={isDarkTheme} />
            ))}
            {hiddenCount > 0 && (
              <span
                className={`shrink-0 text-[10px] font-semibold ${
                  isDarkTheme ? 'text-white/45' : 'text-slate-400'
                }`}
              >
                +{hiddenCount}
              </span>
            )}
          </div>
        </div>
        {manageBtn}
      </div>

      <ScheduleBgDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        entries={entries}
        isDarkTheme={isDarkTheme}
        partyTitle={partyTitle}
        onManageBg={onManageBg}
      />
    </>
  );
};

export default ScheduleBgStrip;
