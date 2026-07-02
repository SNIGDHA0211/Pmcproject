import React from "react";
import type { ActivityTaskStatus, PerformanceLabel } from "./wprUtils";
import { useTheme, getThemeClasses } from "../../utils/theme";

const taskStylesDark: Record<ActivityTaskStatus, string> = {
  completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/35",
  in_progress: "bg-amber-500/20 text-amber-300 border-amber-500/35",
  pending: "bg-rose-500/20 text-rose-300 border-rose-500/35",
};

const taskStylesLight: Record<ActivityTaskStatus, string> = {
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  pending: "bg-rose-100 text-rose-700 border-rose-200",
};

const taskLabels: Record<ActivityTaskStatus, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  pending: "Pending",
};

export const TaskStatusBadge: React.FC<{ status: ActivityTaskStatus; className?: string }> = ({
  status,
  className = "",
}) => {
  const { isDarkTheme } = useTheme();
  const styles = isDarkTheme ? taskStylesDark : taskStylesLight;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide border ${styles[status]} ${className}`}
    >
      {taskLabels[status]}
    </span>
  );
};

const perfStylesDark: Record<PerformanceLabel, string> = {
  Excellent: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  Good: "bg-sky-500/20 text-sky-200 border-sky-500/35",
  Poor: "bg-rose-500/20 text-rose-200 border-rose-500/35",
};

const perfStylesLight: Record<PerformanceLabel, string> = {
  Excellent: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Good: "bg-sky-100 text-sky-700 border-sky-200",
  Poor: "bg-rose-100 text-rose-700 border-rose-200",
};

export const PerformanceBadge: React.FC<{ label: PerformanceLabel; className?: string }> = ({
  label,
  className = "",
}) => {
  const { isDarkTheme } = useTheme();
  const styles = isDarkTheme ? perfStylesDark : perfStylesLight;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-black uppercase tracking-tight border ${styles[label]} ${className}`}
    >
      {label}
    </span>
  );
};

type WorkflowTone = "amber" | "emerald" | "slate";

export const WorkflowStatusBadge: React.FC<{
  label: string;
  tone?: WorkflowTone;
  className?: string;
}> = ({ label, tone = "amber", className = "" }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const tonesDark: Record<WorkflowTone, string> = {
    amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    slate: "bg-white/10 text-contrast border-white/15",
  };

  const tonesLight: Record<WorkflowTone, string> = {
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    slate: "bg-gray-100 text-gray-700 border-gray-200",
  };

  if (!label || label === "—")
    return <span className={`${isDarkTheme ? 'text-white/40' : 'text-gray-400'} text-xs font-bold`}>—</span>;

  const styles = isDarkTheme ? tonesDark : tonesLight;

  return (
    <span
      className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tight border ${styles[tone]} ${className}`}
    >
      {label}
    </span>
  );
};
