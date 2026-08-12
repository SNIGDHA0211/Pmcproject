import React, { useMemo, useState } from 'react';
import { ChevronDown, FileSearch } from 'lucide-react';
import type { MprPreviewSnapshot } from '../../types/mpr';
import { displayValue, humanizeKey } from '../../utils/mprHelpers';
import {
  flattenForDisplay,
  hasSectionData,
  MPR_PREVIEW_SECTIONS,
} from '../../utils/mprPreview';
import { useMprTheme } from '../../utils/mprTheme';

interface MprPreviewPanelProps {
  snapshot: MprPreviewSnapshot | null;
  cacheMeta?: string;
  loading?: boolean;
}

function AccordionSection({
  title,
  defaultOpen,
  children,
  badge,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const mpr = useMprTheme();
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <section className={mpr.accordion}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${
          mpr.isDark ? 'hover:bg-white/5' : 'hover:bg-[#eef6fb]/60'
        }`}
      >
        <span className={`text-xs font-black uppercase tracking-wider ${mpr.isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          {title}
        </span>
        <span className="flex items-center gap-2">
          {badge ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                mpr.isDark ? 'bg-cyan-500/15 text-cyan-200' : 'bg-[#eef6fb] text-[#1e3a5f]'
              }`}
            >
              {badge}
            </span>
          ) : null}
          <ChevronDown
            size={16}
            className={`transition ${open ? 'rotate-180' : ''} ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}
          />
        </span>
      </button>
      {open ? (
        <div className={`border-t px-4 py-4 ${mpr.divider}`}>{children}</div>
      ) : null}
    </section>
  );
}

function KeyValueGrid({ data }: { data: Record<string, unknown> }) {
  const mpr = useMprTheme();
  const entries = Object.entries(data).filter(([, v]) => v != null && v !== '');

  if (entries.length === 0) {
    return <p className={`text-sm ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>No data for this section.</p>;
  }

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className={mpr.kvCell}>
          <dt className={`text-[10px] font-bold uppercase tracking-wide ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {humanizeKey(key)}
          </dt>
          <dd className={`mt-1 text-sm font-semibold leading-snug ${mpr.isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {displayValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const MprPreviewPanel: React.FC<MprPreviewPanelProps> = ({ snapshot, cacheMeta, loading }) => {
  const mpr = useMprTheme();

  const sections = useMemo(() => {
    if (!snapshot) return [];
    return MPR_PREVIEW_SECTIONS.filter(({ key }) =>
      hasSectionData(snapshot[key] as Record<string, unknown>),
    );
  }, [snapshot]);

  if (loading) {
    return (
      <div className={`${mpr.card} flex min-h-[280px] flex-col items-center justify-center`}>
        <div
          className={`h-9 w-9 animate-spin rounded-full border-2 border-t-transparent ${
            mpr.isDark ? 'border-amber-400' : 'border-[#2563a8]'
          }`}
        />
        <p className={`mt-3 text-sm font-semibold ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Loading MPR preview…
        </p>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className={mpr.emptyState}>
        <FileSearch size={36} className={mpr.isDark ? 'text-slate-500' : 'text-slate-400'} aria-hidden />
        <p className={`mt-3 text-sm font-bold ${mpr.isDark ? 'text-white' : 'text-slate-900'}`}>No preview loaded</p>
        <p className={`mt-1 max-w-md text-xs font-medium ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Choose a project and month, then click <strong>Load preview</strong> to review report data before generating PDF/Excel.
        </p>
      </div>
    );
  }

  const period = snapshot.reporting_period;
  const exec = (snapshot.executive_summary ?? {}) as Record<string, unknown>;
  const physical = (snapshot.physical_progress ?? {}) as Record<string, unknown>;
  const equipment = (snapshot.equipment ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-3">
      {cacheMeta ? (
        <p className={`text-[10px] font-bold uppercase tracking-wide ${mpr.isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Server cache: {cacheMeta}
        </p>
      ) : null}

      <AccordionSection title="Reporting period" defaultOpen>
        <KeyValueGrid
          data={{
            month: period?.month,
            start_date: period?.start_date,
            end_date: period?.end_date,
          }}
        />
      </AccordionSection>

      <AccordionSection title="Executive summary" defaultOpen>
        <KeyValueGrid data={flattenForDisplay(exec)} />
      </AccordionSection>

      {hasSectionData(physical) ? (
        <AccordionSection title="Physical progress" defaultOpen>
          <KeyValueGrid data={flattenForDisplay(physical)} />
        </AccordionSection>
      ) : null}

      {hasSectionData(equipment) ? (
        <AccordionSection
          title="Equipment"
          badge={equipment.count != null ? `${equipment.count} items` : undefined}
        >
          <KeyValueGrid
            data={{
              count: equipment.count,
              total_quantity: equipment.total_quantity,
              source_report_date: equipment.source_report_date,
            }}
          />
          {Array.isArray(equipment.inventory) && equipment.inventory.length > 0 ? (
            <div className={`mt-4 overflow-x-auto rounded-xl border ${mpr.divider}`}>
              <table className="min-w-full text-left text-xs">
                <thead className={mpr.isDark ? 'bg-white/5' : 'bg-[#eef6fb]'}>
                  <tr>
                    {['Name', 'Qty', 'Unit', 'Status', 'Remark'].map((h) => (
                      <th
                        key={h}
                        className={`px-3 py-2 font-black uppercase tracking-wide ${mpr.isDark ? 'text-slate-300' : 'text-slate-600'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(equipment.inventory as Record<string, unknown>[]).map((row, i) => (
                    <tr key={i} className={`border-t ${mpr.divider}`}>
                      <td className={`px-3 py-2 font-medium ${mpr.isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {displayValue(row.name)}
                      </td>
                      <td className={`px-3 py-2 ${mpr.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {displayValue(row.qty)}
                      </td>
                      <td className={`px-3 py-2 ${mpr.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {displayValue(row.unit)}
                      </td>
                      <td className={`px-3 py-2 ${mpr.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {displayValue(row.status)}
                      </td>
                      <td className={`px-3 py-2 ${mpr.isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {displayValue(row.remark)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </AccordionSection>
      ) : null}

      {sections.map(({ key, title }) => (
        <AccordionSection key={key} title={title}>
          <KeyValueGrid data={flattenForDisplay((snapshot[key] as Record<string, unknown>) ?? {})} />
        </AccordionSection>
      ))}
    </div>
  );
};

export default MprPreviewPanel;
