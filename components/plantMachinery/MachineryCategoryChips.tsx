import React from 'react';
import { getThemeClasses, useTheme } from '../../utils/theme';

export const MACHINERY_CATEGORY_FILTERS = [
  'All',
  'General',
  'Lifting',
  'Concrete',
  'Logistics',  
  'Vehicle',
] as const;

export type MachineryCategoryFilter = (typeof MACHINERY_CATEGORY_FILTERS)[number];

export function matchesMachineryCategoryFilter(category: string, filter: MachineryCategoryFilter): boolean {
  if (filter === 'All') return true;
  const normalized = category.trim().toLowerCase();
  const needle = filter.toLowerCase();
  return normalized === needle || normalized.includes(needle);
}

interface MachineryCategoryChipsProps {
  value: MachineryCategoryFilter;
  onChange: (value: MachineryCategoryFilter) => void;
}

const MachineryCategoryChips: React.FC<MachineryCategoryChipsProps> = ({ value, onChange }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div className="pm-category-filters flex flex-wrap gap-1.5">
      {MACHINERY_CATEGORY_FILTERS.map((chip) => {
        const active = value === chip;
        return (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(chip)}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
              active
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDarkTheme
                  ? `${themeClasses.buttonSecondary} ${themeClasses.border} border`
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {chip}
          </button>
        );
      })}
    </div>
  );
};

export default MachineryCategoryChips;
