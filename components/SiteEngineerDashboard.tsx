import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  equipmentApi,
  healthSafetyApi,
  manpowerApi,
  normalizeHSERecord,
  projectProgressApi,
  saveHealthSafetyRecord,
  type HSERecord,
} from '../services/api';
import type { Project, User } from '../types';
import { getSiteEngineerProjects } from '../utils/siteEngineerProjects';
import HealthSafetyMonthlyForm, { type HealthSafetyFormValues } from './HealthSafetyMonthlyForm';
import SiteEngineerOverviewPanel, { type SiteEngineerDashboardSnapshot } from './SiteEngineerOverviewPanel';

interface SiteEngineerDashboardProps {
  user: User;
  projects?: Project[];
  onNavigate?: (tab: string) => void;
}

function calculateSafetyScore(hs: SiteEngineerDashboardSnapshot['healthSafety']): number {
  if (!hs) return 100;
  const total =
    hs.fatalities + hs.significant + hs.major + hs.minor + hs.near_miss;
  if (total === 0) return 100;
  return Math.max(0, 100 - total * 5);
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
  const [hseRecord, setHseRecord] = useState<HSERecord | null>(null);
  const [hseFormOpen, setHseFormOpen] = useState(false);
  const [isSavingHse, setIsSavingHse] = useState(false);
  const [hseFormError, setHseFormError] = useState<string | null>(null);

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
      const [hsRes, ppRes, mpDashRes, eqRes] = await Promise.all([
        healthSafetyApi.getAll({ project_name: projectName }),
        projectProgressApi.getProjectProgress({ project_name: projectName }),
        manpowerApi.getManpowerDashboard(projectName),
        equipmentApi.getEquipment({ project_name: projectName }),
      ]);

      const hsData = hsRes.data?.results ?? hsRes.data;
      const hsRows = Array.isArray(hsData) ? hsData : hsData ? [hsData] : [];
      const record = hsRows.length > 0 ? normalizeHSERecord(hsRows[0]) : null;
      setHseRecord(record);

      const healthSafety = record
        ? {
            fatalities: record.fatalities,
            significant: record.significant,
            major: record.major,
            minor: record.minor,
            near_miss: record.nearMiss,
            total_manhours: record.totalManhours,
          }
        : null;

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
        safetyScore: calculateSafetyScore(healthSafety),
        equipmentCount,
        progressChart,
        manpowerChart,
        equipmentChart,
        healthSafety,
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

  const handleSaveHse = async (
    values: HealthSafetyFormValues,
    record?: HSERecord | null,
  ): Promise<boolean> => {
    if (!projectName) return false;
    setIsSavingHse(true);
    setHseFormError(null);
    try {
      await saveHealthSafetyRecord(
        {
          projectName,
          month: values.month,
          year: values.year,
          fatalities: values.fatalities,
          significant: values.significant,
          major: values.major,
          minor: values.minor,
          nearMiss: values.nearMiss,
          totalManhours: values.totalManhours,
          lossOfManhours: values.lossOfManhours,
        },
        { record: record ?? hseRecord ?? undefined },
      );
      setHseFormOpen(false);
      await loadDashboard(true);
      return true;
    } catch {
      setHseFormError('Failed to save Health & Safety data.');
      return false;
    } finally {
      setIsSavingHse(false);
    }
  };

  return (
    <>
      <SiteEngineerOverviewPanel
        projectName={projectName}
        projectOptions={projectOptions}
        onProjectChange={setProjectName}
        loading={loading}
        snapshot={snapshot}
        onNavigate={onNavigate}
        onRefresh={() => void loadDashboard(true)}
        isRefreshing={isRefreshing}
        onEditHse={() => {
          setHseFormError(null);
          setHseFormOpen(true);
        }}
      />

      {hseFormOpen && projectName && (
        <HealthSafetyMonthlyForm
          projectName={projectName}
          record={hseRecord}
          isSaving={isSavingHse}
          error={hseFormError}
          onClose={() => {
            if (!isSavingHse) setHseFormOpen(false);
          }}
          onSubmit={handleSaveHse}
        />
      )}
    </>
  );
};

export default SiteEngineerDashboard;
