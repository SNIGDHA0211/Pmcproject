import React, { useMemo, useState } from 'react';
import { Building2, ChevronDown, Search } from 'lucide-react';
import { useMprTheme } from '../../utils/mprTheme';

export type MprProjectOption = { id: string; label: string };

interface MprProjectSelectProps {
  options: MprProjectOption[];
  value: string;
  onChange: (id: string) => void;
}

const MprProjectSelect: React.FC<MprProjectSelectProps> = ({ options, value, onChange }) => {
  const mpr = useMprTheme();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="relative">
      <label className={`mb-1.5 flex items-center gap-1.5 ${mpr.label}`}>
        <Building2 size={12} aria-hidden />
        Project
      </label>
      <div className="relative">
        <Search
          size={14}
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}
          aria-hidden
        />
        <input
          type="text"
          value={open ? query : selected?.label || ''}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Search project…"
          title={selected?.label}
          className={`${mpr.input} pl-9 pr-9`}
        />
        <ChevronDown
          size={14}
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${mpr.isDark ? 'text-cyan-200/70' : 'text-slate-500'}`}
          aria-hidden
        />
      </div>
      {open && filtered.length > 0 ? (
        <ul
          className={`absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border shadow-xl ${
            mpr.isDark ? 'border-white/15 bg-[#0b1522]' : 'border-slate-200 bg-white'
          }`}
        >
          {filtered.slice(0, 80).map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className={`w-full px-3 py-2.5 text-left text-sm font-medium transition ${
                  opt.id === value
                    ? mpr.isDark
                      ? 'bg-cyan-500/15 text-cyan-200'
                      : 'bg-[#eef6fb] text-[#1e3a5f]'
                    : mpr.isDark
                      ? 'text-slate-200 hover:bg-white/10'
                      : 'text-slate-800 hover:bg-slate-50'
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(opt.id);
                  setQuery('');
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {options.length === 0 ? (
        <p className={`mt-1 text-[11px] ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          No projects available.
        </p>
      ) : null}
    </div>
  );
};

export default MprProjectSelect;
