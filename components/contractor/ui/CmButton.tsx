import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useCmTheme } from '../enterpriseTheme';

export type CmButtonVariant = 'primary' | 'secondary';

export interface CmButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CmButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
}

const CmButton: React.FC<CmButtonProps> = ({
  variant = 'primary',
  icon: Icon,
  loading = false,
  disabled,
  children,
  className = '',
  type = 'button',
  ...props
}) => {
  const theme = useCmTheme();
  const variantClass = variant === 'primary' ? theme.btn.primary : theme.btn.secondary;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${theme.btn.base} ${variantClass} ${className}`}
      {...props}
    >
      {Icon && <Icon size={14} className={loading ? 'animate-spin' : ''} aria-hidden />}
      {children}
    </button>
  );
};

export default CmButton;
