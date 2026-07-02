import React from 'react';

interface StatusBadgeProps {
  status: string;
  isDarkTheme?: boolean;
  compact?: boolean;
}

const STATUS_STYLES: Record<string, { label: string; light: string; dark: string }> = {
  pending: {
    label: 'Pending',
    light: 'bg-[#FEF3C7] text-[#B45309]',
    dark: 'bg-amber-500/20 text-amber-400',
  },
  in_progress: {
    label: 'In Progress',
    light: 'bg-[#DBEAFE] text-[#1D4ED8]',
    dark: 'bg-blue-500/20 text-blue-300',
  },
  completed: {
    label: 'Completed',
    light: 'bg-[#DCFCE7] text-[#15803D]',
    dark: 'bg-emerald-500/20 text-emerald-400',
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isDarkTheme = false, compact = false }) => {
  const key = status?.toLowerCase().replace(/\s+/g, '_') ?? '';
  const config = STATUS_STYLES[key] ?? {
    label: status?.replace(/_/g, ' ') ?? 'Unknown',
    light: 'bg-slate-100 text-slate-600',
    dark: 'bg-slate-500/20 text-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-medium ${
        compact ? 'h-6 px-2 text-[11px]' : 'h-7 px-3 text-[13px] font-semibold'
      } ${isDarkTheme ? config.dark : config.light}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
