import React from 'react';
import type { MprKpiItem } from '../../utils/mprPreview';
import { useMprTheme } from '../../utils/mprTheme';

interface MprKpiStripProps {
  items: MprKpiItem[];
}

const MprKpiStrip: React.FC<MprKpiStripProps> = ({ items }) => {
  const mpr = useMprTheme();

  if (items.length === 0) return null;

  const toneCls = (tone: MprKpiItem['tone']) => {
    switch (tone) {
      case 'success':
        return mpr.isDark
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-emerald-200 bg-emerald-50/90';
      case 'warning':
        return mpr.isDark
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'border-amber-200 bg-amber-50/90';
      case 'muted':
        return mpr.isDark
          ? 'border-white/10 bg-white/5'
          : 'border-slate-200 bg-[#eef6fb]/80';
      default:
        return mpr.isDark
          ? 'border-cyan-500/25 bg-cyan-500/8'
          : 'border-[#b8cfe0] bg-white';
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-2xl border p-4 shadow-sm ${toneCls(item.tone)}`}
        >
          <p className={`text-[10px] font-black uppercase tracking-wide ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {item.label}
          </p>
          <p className={`mt-1 text-lg font-black tracking-tight ${mpr.isDark ? 'text-white' : 'text-slate-900'}`}>
            {item.value}
          </p>
          {item.hint ? (
            <p className={`mt-1 truncate text-[10px] font-medium ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {item.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default MprKpiStrip;
