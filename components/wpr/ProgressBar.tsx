import React from "react";
import { useTheme, getThemeClasses } from "../../utils/theme";

type ProgressBarProps = {
  value: number;
  max?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  heightClassName?: string;
  "aria-label"?: string;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className = "",
  trackClassName,
  barClassName = "bg-indigo-500",
  heightClassName = "h-2",
  "aria-label": ariaLabel,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const denom = max > 0 ? max : 100;
  const pct = Math.min(100, Math.max(0, (value / denom) * 100));
  
  const defaultTrackClass = isDarkTheme ? "bg-white/10" : "bg-gray-200";

  return (
    <div
      className={`w-full rounded-full overflow-hidden ${heightClassName} ${trackClassName || defaultTrackClass} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? "Progress"}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${barClassName}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
