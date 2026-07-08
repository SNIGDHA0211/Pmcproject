import React from 'react';
import type { PendingUserGroup } from '../../utils/pmcHeadPendingUpdates';
import { Icons } from '../Icons';

interface PendingUpdateUserCardProps {
  group: PendingUserGroup;
  isDarkTheme: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export const PendingUpdateUserCard: React.FC<PendingUpdateUserCardProps> = ({
  group,
  isDarkTheme,
  isSelected,
  onClick,
}) => {
  const cardCls = `rounded-xl border p-3 cursor-pointer transition-colors ${
    isDarkTheme
      ? `border-white/10 hover:border-white/20 ${isSelected ? 'bg-white/[0.05] ring-1 ring-amber-500/30' : 'bg-white/[0.02]'}`
      : `border-slate-200 bg-white shadow-sm hover:border-slate-300 ${isSelected ? 'ring-1 ring-amber-300 bg-amber-50/40' : ''}`
  }`;

  const tagCls = `rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
    isDarkTheme ? 'bg-white/10 text-white/75' : 'bg-slate-100 text-slate-600'
  }`;

  const sectionTagCls = `rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
    isDarkTheme ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-800'
  }`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cardCls}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isDarkTheme ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-100 text-amber-700'
          }`}
          aria-hidden
        >
          <Icons.AlertCircle size={14} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                isDarkTheme ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-100 text-amber-800'
              }`}
            >
              Not Updated
            </span>
            <span className={tagCls}>
              {group.pendingSectionCount} section{group.pendingSectionCount > 1 ? 's' : ''}
            </span>
          </div>

          <p className={`mt-1.5 text-sm font-black leading-tight ${isDarkTheme ? 'text-contrast' : 'text-slate-900'}`}>
            {group.userIdLabel}
            <span className={`ml-1.5 text-[10px] font-bold ${isDarkTheme ? 'text-white/60' : 'text-slate-500'}`}>
              · {group.roleLabel}
            </span>
          </p>

          {group.displayName !== group.userIdLabel && (
            <p className={`mt-0.5 text-[10px] font-medium ${isDarkTheme ? 'text-white/60' : 'text-slate-500'}`}>
              {group.displayName}
            </p>
          )}

          <div className={`mt-2 rounded-lg border px-2 py-1.5 ${
            isDarkTheme ? 'border-indigo-500/20 bg-indigo-500/10' : 'border-indigo-100 bg-indigo-50/60'
          }`}>
            <p className={`text-[8px] font-black uppercase tracking-wider ${isDarkTheme ? 'text-indigo-300' : 'text-indigo-700'}`}>
              Project{group.projectNames.length > 1 ? 's' : ''}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {group.projectNames.map((project) => (
                <span
                  key={project}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${
                    isDarkTheme ? 'bg-white/10 text-white/90' : 'bg-white text-slate-800 border border-indigo-100'
                  }`}
                >
                  {project}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {group.sectionLabels.map((section) => (
              <span key={section} className={sectionTagCls}>
                {section}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface PendingUpdateDetailProps {
  group: PendingUserGroup | null;
  isDarkTheme: boolean;
  windowDays: number;
}

export const PendingUpdateDetail: React.FC<PendingUpdateDetailProps> = ({
  group,
  isDarkTheme,
  windowDays,
}) => {
  const metaTile = `rounded-lg border px-2.5 py-1.5 ${
    isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
  }`;

  if (!group) {
    return (
      <p className={`py-8 text-center text-sm ${isDarkTheme ? 'text-white/60' : 'text-slate-500'}`}>
        Select a team member to view which sections are not updated.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={`text-sm font-black ${isDarkTheme ? 'text-contrast' : 'text-slate-900'}`}>
          {group.userIdLabel} · {group.roleLabel}
        </p>
        <p className={`mt-1 text-xs leading-relaxed ${isDarkTheme ? 'text-white/70' : 'text-slate-600'}`}>
          {group.pendingSectionCount} section{group.pendingSectionCount > 1 ? 's have' : ' has'} not been updated
          in the last {windowDays} days.
        </p>
      </div>

      <div className={`rounded-lg border px-2.5 py-2 ${
        isDarkTheme ? 'border-indigo-500/25 bg-indigo-500/10' : 'border-indigo-100 bg-indigo-50/70'
      }`}>
        <p className={`text-[9px] font-black uppercase tracking-wider ${isDarkTheme ? 'text-indigo-300' : 'text-indigo-700'}`}>
          Projects Affected ({group.projectNames.length})
        </p>
        <div className="mt-1.5 space-y-1">
          {group.projectNames.map((project) => (
            <p
              key={project}
              className={`text-xs font-semibold leading-snug ${isDarkTheme ? 'text-white/90' : 'text-slate-800'}`}
            >
              {project}
            </p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          ['User ID', group.userIdLabel],
          ['Name', group.displayName],
          ['Role', group.roleLabel],
          ['Sections', String(group.pendingSectionCount)],
        ].map(([label, value]) => (
          <div key={String(label)} className={metaTile}>
            <p className={`text-[8px] font-bold uppercase ${isDarkTheme ? 'text-white/50' : 'text-slate-500'}`}>
              {label}
            </p>
            <p className={`mt-0.5 text-xs font-semibold leading-tight ${isDarkTheme ? 'text-contrast' : 'text-slate-900'}`}>
              {value || '—'}
            </p>
          </div>
        ))}
      </div>

      <div>
        <p className={`mb-1.5 text-[9px] font-black uppercase tracking-widest ${isDarkTheme ? 'text-white/70' : 'text-slate-700'}`}>
          Sections Not Updated
        </p>
        <div className="space-y-1.5">
          {group.sections.map((section) => (
            <div key={section.sectionKey} className={metaTile}>
              <p className={`text-xs font-bold ${isDarkTheme ? 'text-contrast' : 'text-slate-900'}`}>
                {section.sectionLabel}
              </p>
              <p className={`mt-0.5 text-[9px] font-bold uppercase tracking-wide ${isDarkTheme ? 'text-white/45' : 'text-slate-400'}`}>
                {section.projectNames.length} project{section.projectNames.length > 1 ? 's' : ''}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {section.projectNames.map((project) => (
                  <span
                    key={`${section.sectionKey}-${project}`}
                    className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold leading-tight ${
                      isDarkTheme ? 'bg-white/10 text-white/80' : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {project}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
