import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MachineryMaster } from '../../types';
import { Icons } from '../Icons';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface MachinerySearchSelectorProps {
  options: MachineryMaster[];
  value: string;
  onChange: (machineryId: string) => void;
  onAddNew: (searchTerm: string) => void;
  placeholder?: string;
  className?: string;
}

const MachinerySearchSelector: React.FC<MachinerySearchSelectorProps> = ({
  options,
  value,
  onChange,
  onAddNew,
  placeholder = 'Search machinery...',
  className = '',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selected = useMemo(
    () => options.find((item) => String(item.id) === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.unit.toLowerCase().includes(query)
    );
  }, [options, searchTerm]);

  const displayValue = open ? searchTerm : selected?.name ?? searchTerm;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectOption = (item: MachineryMaster) => {
    onChange(String(item.id));
    setSearchTerm('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative min-w-[220px] flex-1 ${className}`}>
      <div className="relative">
        <Icons.Search
          size={16}
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`}
        />
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) onChange('');
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full rounded-xl border py-3 pl-10 pr-4 text-sm font-bold outline-none focus:ring-4 transition-all ${
            isDarkTheme
              ? 'bg-slate-800 border-white/10 focus:ring-indigo-500/20 text-slate-200'
              : 'bg-white border-slate-200 focus:ring-indigo-500/10 text-slate-800'
          }`}
        />
      </div>

      {open && (
        <div
          className={`absolute z-50 mt-2 max-h-56 w-full overflow-auto rounded-xl border shadow-xl ${
            isDarkTheme ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'
          }`}
        >
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectOption(item)}
                className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors ${
                  String(item.id) === value
                    ? isDarkTheme
                      ? 'bg-indigo-500/20'
                      : 'bg-indigo-50'
                    : isDarkTheme
                      ? 'hover:bg-white/5'
                      : 'hover:bg-slate-50'
                }`}
              >
                <span className={`text-sm font-bold ${themeClasses.textPrimary}`}>{item.name}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${themeClasses.textMuted}`}>
                  {item.category} · {item.unit}
                </span>
              </button>
            ))
          ) : (
            <div className="p-3">
              <p className={`mb-2 text-center text-[10px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
                No machinery found
              </p>
              <button
                type="button"
                onClick={() => {
                  onAddNew(searchTerm.trim());
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white ${themeClasses.buttonPrimary}`}
              >
                <Icons.Add size={12} />
                Add New Machinery
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(MachinerySearchSelector);
