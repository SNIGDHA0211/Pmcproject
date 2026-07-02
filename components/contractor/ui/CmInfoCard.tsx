import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useCmTheme } from '../enterpriseTheme';

export interface CmInfoCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  className?: string;
}

const CmInfoCard: React.FC<CmInfoCardProps> = ({ icon: Icon, title, subtitle, className = '' }) => {
  const theme = useCmTheme();

  return (
    <div className={`${theme.infoCard} ${className}`} role="status">
      <span className={theme.infoIcon} aria-hidden>
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={theme.infoTitle}>{title}</p>
        <p className={theme.infoSubtitle}>{subtitle}</p>
      </div>
    </div>
  );
};

export default CmInfoCard;
