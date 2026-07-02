import React from 'react';

interface FinancialFormSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
}

/** Wrapper for editable forms — placed below dashboard visuals */
const FinancialFormSection: React.FC<FinancialFormSectionProps> = ({
  title,
  subtitle,
  children,
  actions,
  className = '',
  isDarkTheme,
  themeClasses,
}) => (
  <div
    className={`financial-form-section rounded-2xl border p-5 ${className} ${
      isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-[#E2E8F0] bg-white'
    }`}
  >
    <div className="mb-4 border-b border-[#F1F5F9] pb-3 dark:border-white/10">
      <h3 className={`text-sm font-semibold ${isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'}`}>
        {title}
      </h3>
      {subtitle && (
        <p className={`mt-1 text-xs font-medium ${isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'}`}>
          {subtitle}
        </p>
      )}
    </div>
    {children}
    {actions && <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F1F5F9] pt-4 dark:border-white/10">{actions}</div>}
  </div>
);

export const financialFieldLabel = (isDarkTheme: boolean, themeClasses: Record<string, string>) =>
  `mb-1.5 block text-[13px] font-semibold ${isDarkTheme ? themeClasses.textSecondary : 'text-[#475569]'}`;

export const financialFieldInput = (isDarkTheme: boolean, themeClasses: Record<string, string>) =>
  `h-12 w-full rounded-lg border px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#4F46E5]/25 ${
    isDarkTheme ? `${themeClasses.input} ${themeClasses.border}` : 'border-[#E2E8F0] bg-white text-[#0F172A] focus:border-[#4F46E5]'
  }`;

export default FinancialFormSection;
