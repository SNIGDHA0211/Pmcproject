import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useCmTheme } from './enterpriseTheme';

interface EnterpriseKpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  compact?: boolean;
  onClick?: () => void;
}

const EnterpriseKpiCard: React.FC<EnterpriseKpiCardProps> = ({
  icon: Icon,
  label,
  value,
  sublabel,
  tone = 'neutral',
  compact = false,
  onClick,
}) => {
  const theme = useCmTheme();
  const t = theme.kpiTones[tone];
  const Tag = onClick ? 'button' : 'div';

  if (compact) {
    return (
      <Tag
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={`${theme.card} ${t.bg} ring-1 ${t.ring} flex min-w-[140px] flex-1 items-center gap-3 px-3 py-3 text-left transition-transform hover:-translate-y-0.5 sm:min-w-[155px] sm:px-4 sm:py-3.5 ${
          onClick ? 'cursor-pointer' : ''
        }`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${t.icon}`}>
          <Icon size={17} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className={`truncate text-[10px] font-bold uppercase tracking-wide ${theme.tc.textMuted}`}>{label}</p>
          <p className={`truncate text-sm font-black tabular-nums leading-tight sm:text-base ${t.val}`}>{value}</p>
        </div>
      </Tag>
    );
  }

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`${theme.card} ${t.bg} ring-1 ${t.ring} p-4 text-left transition-transform hover:-translate-y-0.5 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
          <Icon size={18} strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.tc.textMuted}`}>{label}</p>
          <p className={`text-xl font-black tabular-nums leading-tight ${t.val}`}>{value}</p>
          {sublabel && <p className={`mt-0.5 truncate text-[11px] ${theme.tc.textMuted}`}>{sublabel}</p>}
        </div>
      </div>
    </Tag>
  );
};

export default EnterpriseKpiCard;
