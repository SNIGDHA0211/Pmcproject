import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  equipmentApi,
  manpowerApi,
  projectProgressApi,
} from '../services/api';
import type { Project, User } from '../types';
import { getSiteEngineerProjects } from '../utils/siteEngineerProjects';
import SiteEngineerOverviewPanel, { type SiteEngineerDashboardSnapshot } from './SiteEngineerOverviewPanel';

interface SiteEngineerDashboardProps {
  user: User;
  projects?: Project[];
  onNavigate?: (tab: string) => void;
}

const SiteEngineerDashboard: React.FC<SiteEngineerDashboardProps> = ({
  user,
  projects = [],
  onNavigate = () => {},
}) => {
  const assignedProjects = useMemo(
    () => getSiteEngineerProjects(projects, user),
    [projects, user.id],
  );

  const projectOptions = useMemo(
    () => assignedProjects.map((p) => p.title).filter(Boolean),
    [assignedProjects],
  );

  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState<SiteEngineerDashboardSnapshot | null>(null);

  useEffect(() => {
    if (!projectName && projectOptions.length > 0) {
      setProjectName(projectOptions[0]);
    }
  }, [projectName, projectOptions]);

  const loadDashboard = useCallback(async (background = false) => {
    if (!projectName.trim()) {
      setSnapshot(null);
      return;
    }
    if (background) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [ppRes, mpDashRes, eqRes] = await Promise.all([
        projectProgressApi.getProjectProgress({ project_name: projectName }),
        manpowerApi.getManpowerDashboard(projectName),
        equipmentApi.getEquipment({ project_name: projectName }),
      ]);

      const ppData = ppRes.data.results || ppRes.data;
      const progressRows = Array.isArray(ppData) ? ppData : [];
      const progressChart = progressRows.map((pp: Record<string, unknown>) => ({
        month: pp.progress_month
          ? new Date(String(pp.progress_month)).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
          : 'N/A',
        plan: Number(pp.cumulative_plan) || 0,
        actual: Number(pp.cumulative_actual) || 0,
      }));

      const latestProgress =
        progressRows.length > 0
          ? Number(progressRows[progressRows.length - 1]?.cumulative_actual) || 0
          : 0;

      const mpDash = mpDashRes.data;
      const manpowerChart =
        mpDash?.months?.map((month: string, index: number) => ({
          month,
          planned: Number(mpDash.planned_manpower?.[index]) || 0,
          actual: Number(mpDash.actual_manpower?.[index]) || 0,
        })) ?? [];

      const manpowerTotal =
        mpDash?.actual_manpower?.length > 0
          ? Number(mpDash.actual_manpower[mpDash.actual_manpower.length - 1]) || 0
          : 0;

      const eqData = eqRes.data.results || eqRes.data;
      const eqRows = Array.isArray(eqData) ? eqData : [];
      const equipmentChart = eqRows.map((eq: Record<string, unknown>) => ({
        month: String(eq.month_display ?? 'N/A'),
        plannedMonthly: Number(eq.planned_equipment) || 0,
        actualMonthly: Number(eq.actual_equipment) || 0,
        plannedCumulative: Number(eq.planned_cumulative) || 0,
        actualCumulative: Number(eq.actual_cumulative) || 0,
      }));

      const equipmentCount = eqRows.reduce(
        (sum: number, eq: Record<string, unknown>) => sum + (Number(eq.actual_equipment) || 0),
        0,
      );

      setSnapshot({
        progressPct: latestProgress,
        manpowerTotal,
        safetyScore: 100,
        equipmentCount,
        progressChart,
        manpowerChart,
        equipmentChart,
        healthSafety: null,
      });
    } catch (err) {
      console.error('Site engineer dashboard load failed:', err);
      setSnapshot(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [projectName]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <SiteEngineerOverviewPanel
      projectName={projectName}
      projectOptions={projectOptions}
      onProjectChange={setProjectName}
      loading={loading}
      snapshot={snapshot}
      onNavigate={onNavigate}
      onRefresh={() => void loadDashboard(true)}
      isRefreshing={isRefreshing}
    />
  );
};

export default SiteEngineerDashboard;
