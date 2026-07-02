import React from "react";
import { useTheme, getThemeClasses } from "../../utils/theme";

type SummaryCardProps = {
  title?: string;
  titleIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
};

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  titleIcon,
  children,
  className = "",
  padded = true,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isDarkTheme 
          ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]" 
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 shadow-sm"
      } ${padded ? "p-4" : ""} ${className}`}
    >
      {title ? (
        <div className="flex items-center gap-2 mb-3">
          {titleIcon}
          <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
            {title}
          </span>
        </div>
      ) : null}
      {children}
    </div>
  );
};
