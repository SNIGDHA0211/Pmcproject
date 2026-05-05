import React, { useState, useEffect } from 'react';
import { Project, UserRole, ProjectStatus } from '../types';
import { Icons } from './Icons';
import { FullScreenCard } from './FullScreenCard';
import { formatINR } from '../App';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import { projectApi, costPerformanceApi, equipmentApi, budgetPerformanceApi, manpowerApi, cashflowApi, healthSafetyApi, projectProgressApi, invoicingApi, contractsApi, contractPerformanceApi, unwrapList, toNum } from '../services/api';
import { useTheme, getThemeClasses } from '../utils/theme';

interface ProjectsProps {
  projects: Project[];
  currentUser: { id: string; role: UserRole };
  onViewProject: (id: string) => void;
  onNavigate?: (tab: string) => void;
}

// Safety Pyramid Component - Centered pyramid with legends alongside
const PYRAMID_HEIGHT = 140;
const PYRAMID_WIDTH = 280;

const SafetyPyramid: React.FC<{ stats?: { fatalities: number; significant: number; major: number; minor: number; nearMiss: number } }> = ({ stats }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const defaultStats = stats || { fatalities: 0, significant: 0, major: 0, minor: 0, nearMiss: 0 };
  const tiers = [
    { label: 'FATALITIES', count: defaultStats.fatalities, color: '#000000', textColor: 'text-white' },
    { label: 'SIGNIFICANT', count: defaultStats.significant, color: '#dc2626', textColor: 'text-white' },
    { label: 'MAJOR', count: defaultStats.major, color: '#f97316', textColor: 'text-white' },
    { label: 'MINOR', count: defaultStats.minor, color: '#facc15', textColor: 'text-slate-900' },
    { label: 'NEAR MISS', count: defaultStats.nearMiss, color: '#22c55e', textColor: 'text-white' },
  ];
  const totalTiers = tiers.length;
  const tierHeightPct = 100 / totalTiers;

  return (
    <div className="w-full flex items-stretch gap-3">
      {/* Legends - left side, aligned with each pyramid tier */}
      <div
        className={`flex flex-col flex-shrink-0 justify-stretch ${themeClasses.textPrimary}`}
        style={{ width: 100, height: PYRAMID_HEIGHT }}
      >
        {tiers.map((tier, idx) => (
          <div
            key={idx}
            className={`flex flex-col justify-center border-b flex-1 min-h-0 ${themeClasses.border}`}
            style={{ paddingBottom: 2 }}
          >
            <span className="text-[8px] font-black uppercase tracking-tight leading-tight">
              {tier.label}
            </span>
          </div>
        ))}
      </div>
      {/* Pyramid */}
      <div className="relative flex-1" style={{ maxWidth: PYRAMID_WIDTH, height: PYRAMID_HEIGHT }}>
        {tiers.map((tier, idx) => {
          const topWidthPct = (idx / totalTiers) * 100;
          const bottomWidthPct = ((idx + 1) / totalTiers) * 100;
          const leftTop = 50 - topWidthPct / 2;
          const rightTop = 50 + topWidthPct / 2;
          const leftBottom = 50 - bottomWidthPct / 2;
          const rightBottom = 50 + bottomWidthPct / 2;
          const topY = (idx / totalTiers) * 100;
          const clipPath = idx === 0
            ? `polygon(50% 0%, ${rightBottom}% 100%, ${leftBottom}% 100%)`
            : `polygon(${leftTop}% 0%, ${rightTop}% 0%, ${rightBottom}% 100%, ${leftBottom}% 100%)`;

          return (
            <div
              key={idx}
              className="absolute flex items-center justify-center"
              style={{
                clipPath,
                top: `${topY}%`,
                left: 0,
                right: 0,
                height: `${tierHeightPct}%`,
              }}
            >
              <div
                className={`w-full h-full flex items-center justify-end px-2 ${tier.textColor}`}
                style={{ backgroundColor: tier.color }}
              >
                <span className="text-[10px] font-black tabular-nums">{tier.count}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Improved Gauge Component
const GaugeChart: React.FC<{ value: number; maxValue: number; label?: string }> = ({
  value,
  maxValue,
  label
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const percentage = Math.min((value / maxValue) * 100, 100);
  const angle = (percentage / 100) * 180;

  // Color zones based on screenshot: red (~45%), yellow (~5%), green (~50%)
  // Red: 0-45% (0-81 degrees), Yellow: 45-50% (81-90 degrees), Green: 50-100% (90-180 degrees)
  const redEndAngle = 81; // 45% of 180 degrees
  const yellowEndAngle = 90; // 50% of 180 degrees

  // Calculate arc endpoints for color zones
  const redEndX = 50 + 40 * Math.cos((180 - redEndAngle) * Math.PI / 180);
  const yellowEndX = 50 + 40 * Math.cos((180 - yellowEndAngle) * Math.PI / 180);

  return (
    <div className="flex flex-col items-center w-full sm:w-auto pb-1">
      <div className="relative w-44 h-24 flex-shrink-0" style={{ padding: '2px 4px 12px' }}>
        <svg
          className="w-full h-full block"
          viewBox="0 0 100 50"
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: 'visible', display: 'block' }}
        >
          {/* Colored zones - matching screenshot proportions */}
          <path d={`M 10 40 A 40 40 0 0 1 ${redEndX} ${40 - 40 * Math.sin((180 - redEndAngle) * Math.PI / 180)}`} fill="none" stroke="#ef4444" strokeWidth="6" />
          <path d={`M ${redEndX} ${40 - 40 * Math.sin((180 - redEndAngle) * Math.PI / 180)} A 40 40 0 0 1 ${yellowEndX} ${40 - 40 * Math.sin((180 - yellowEndAngle) * Math.PI / 180)}`} fill="none" stroke="#f59e0b" strokeWidth="6" />
          <path d={`M ${yellowEndX} ${40 - 40 * Math.sin((180 - yellowEndAngle) * Math.PI / 180)} A 40 40 0 0 1 90 40`} fill="none" stroke="#10b981" strokeWidth="6" />

          {/* Needle - theme aware */}
          <line
            x1="50"
            y1="40"
            x2={50 + 35 * Math.cos((180 - angle) * Math.PI / 180)}
            y2={40 - 35 * Math.sin((180 - angle) * Math.PI / 180)}
            stroke={isDarkTheme ? "#60a5fa" : "#1e3a8a"}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <span className={`text-[10px] font-black ${themeClasses.textPrimary}`}>{percentage.toFixed(1)}%</span>
        </div>
      </div>
      {label && <span className={`text-[9px] font-bold uppercase mt-0.5 ${themeClasses.textSecondary}`}>{label}</span>}
    </div>
  );
};

// Donut Chart Component
const DonutChart: React.FC<{
  data: { name: string; value: number; color: string }[];
  label: string;
  size?: number;
  showLabels?: boolean;
}> = ({ data, label, size = 150, showLabels = true }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.4}
            outerRadius={size * 0.5}
            paddingAngle={0}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      {showLabels && (
        <>
          <div className="text-center mt-2">
            <p className={`text-xs font-black uppercase ${themeClasses.textPrimary}`}>{label}</p>
            {data.map((item, idx) => (
              <p key={idx} className={`text-[10px] font-bold ${themeClasses.textSecondary}`}>
                {item.name}: {item.value.toFixed(2)}%
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Projects: React.FC<ProjectsProps> = ({ projects, currentUser, onViewProject, onNavigate }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const allProjects = projects;

  const pickBestRow = <T,>(rows: T[], score: (row: any) => number): T | null => {
    if (!rows || rows.length === 0) return null;
    let best = rows[0];
    let bestScore = score(best);
    for (let i = 1; i < rows.length; i++) {
      const s = score(rows[i]);
      if (s > bestScore) {
        best = rows[i];
        bestScore = s;
      }
    }
    return best;
  };

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    allProjects.length > 0 ? allProjects[0].id : ''
  );
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [costPerformanceData, setCostPerformanceData] = useState<any[]>([]);
  const [isLoadingCostPerformance, setIsLoadingCostPerformance] = useState(false);
  const [equipmentDataState, setEquipmentDataState] = useState<any[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [budgetPerformanceData, setBudgetPerformanceData] = useState<any>(null);
  const [isLoadingBudgetPerformance, setIsLoadingBudgetPerformance] = useState(false);
  const [manpowerDataState, setManpowerDataState] = useState<any[]>([]);
  const [isLoadingManpower, setIsLoadingManpower] = useState(false);
  const [cashflowDataState, setCashflowDataState] = useState<any[]>([]);
  const [isLoadingCashflow, setIsLoadingCashflow] = useState(false);
  const [healthSafetyData, setHealthSafetyData] = useState<any>(null);
  const [isLoadingHealthSafety, setIsLoadingHealthSafety] = useState(false);
  const [projectProgressData, setProjectProgressData] = useState<any[]>([]);
  const [isLoadingProjectProgress, setIsLoadingProjectProgress] = useState(false);
  const [invoicingData, setInvoicingData] = useState<any>(null);
  const [isLoadingInvoicing, setIsLoadingInvoicing] = useState(false);
  const [contractsData, setContractsData] = useState<any>(null);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [contractPerformanceData, setContractPerformanceData] = useState<any>(null);
  const [isLoadingContractPerformance, setIsLoadingContractPerformance] = useState(false);

  const selectedProject = allProjects.find(p => p.id === selectedProjectId) || allProjects[0] || null;

  useEffect(() => {
    if (selectedProjectId) {
      projectApi.getDashboardData(selectedProjectId)
        .then(response => {
          setDashboardData(response.data);
        })
        .catch(error => {
          // Dashboard data doesn't exist yet, that's okay
          setDashboardData(null);
        });
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (allProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(allProjects[0].id);
    }
  }, [allProjects, selectedProjectId]);

  // Fetch cost performance data when selected project changes
  useEffect(() => {
    const fetchCostPerformanceData = async () => {
      if (!selectedProject?.title) {
        setCostPerformanceData([]);
        return;
      }

      setIsLoadingCostPerformance(true);
      try {
        const response = await costPerformanceApi.getCostPerformance({ project_name: selectedProject.title });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          // Transform API data to match chart format
          const transformedData = rows.map((item: any) => ({
            month: item.month_year,
            bcws: toNum(item.bcws),
            bcwp: toNum(item.bcwp),
            acwp: toNum(item.acwp),
            fcst: toNum(item.fcst),
          }));
          setCostPerformanceData(transformedData);
        } else {
          setCostPerformanceData([]);
        }
      } catch (error) {
        console.error('Error fetching cost performance data:', error);
        setCostPerformanceData([]);
      } finally {
        setIsLoadingCostPerformance(false);
      }
    };

    fetchCostPerformanceData();
  }, [selectedProject?.title]);

  // Fetch equipment data when selected project changes
  useEffect(() => {
    const fetchEquipmentData = async () => {
      if (!selectedProject?.title) {
        setEquipmentDataState([]);
        return;
      }

      setIsLoadingEquipment(true);
      try {
        const response = await equipmentApi.getEquipment({ project_name: selectedProject.title });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          // Transform API data to match chart format (category-based)
          const transformedData = rows.map((item: any) => ({
            category: item.month_display || item.month,
            planned: item.planned_equipment,
            actual: item.actual_equipment
          }));
          setEquipmentDataState(transformedData);
        } else {
          setEquipmentDataState([]);
        }
      } catch (error) {
        console.error('Error fetching equipment data:', error);
        setEquipmentDataState([]);
      } finally {
        setIsLoadingEquipment(false);
      }
    };

    fetchEquipmentData();
  }, [selectedProject?.title]);

  // Fetch budget performance data when selected project changes
  useEffect(() => {
    const fetchBudgetPerformanceData = async () => {
      if (!selectedProject?.title) {
        setBudgetPerformanceData(null);
        return;
      }

      setIsLoadingBudgetPerformance(true);
      try {
        const response = await budgetPerformanceApi.getBudgetPerformance({ project_name: selectedProject.title });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          const best = pickBestRow(rows, (r) =>
            toNum(r?.bac) + toNum(r?.eac) + toNum(r?.etg) + Math.abs(toNum(r?.vac)) + Math.abs(toNum(r?.cv))
          );
          setBudgetPerformanceData(best);
        } else {
          setBudgetPerformanceData(null);
        }
      } catch (error) {
        console.error('Error fetching budget performance data:', error);
        setBudgetPerformanceData(null);
      } finally {
        setIsLoadingBudgetPerformance(false);
      }
    };

    fetchBudgetPerformanceData();
  }, [selectedProject?.title]);

  // Fetch manpower data when selected project changes
  useEffect(() => {
    const fetchManpowerData = async () => {
      if (!selectedProject?.title) {
        setManpowerDataState([]);
        return;
      }

      setIsLoadingManpower(true);
      try {
        const response = await manpowerApi.getManpower({ project_name: selectedProject.title });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          // Transform API data to match chart format
          const transformedData = rows.map((item: any) => ({
            month: item.month_year,
            planned: item.planned_manpower,
            actual: item.actual_manpower
          }));
          setManpowerDataState(transformedData);
        } else {
          setManpowerDataState([]);
        }
      } catch (error) {
        console.error('Error fetching manpower data:', error);
        setManpowerDataState([]);
      } finally {
        setIsLoadingManpower(false);
      }
    };

    fetchManpowerData();
  }, [selectedProject?.title]);

  // Fetch cashflow data when selected project changes
  useEffect(() => {
    const fetchCashflowData = async () => {
      if (!selectedProject?.title) {
        setCashflowDataState([]);
        return;
      }

      setIsLoadingCashflow(true);
      try {
        const response = await cashflowApi.getCashflow({ project_name: selectedProject.title });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          // Transform API data to match chart format
          const transformedData = rows.map((item: any) => ({
            month: item.month_year,
            cashIn: item.cash_in_monthly_actual,
            cashOut: item.cash_out_monthly_actual,
            cumPlanIn: item.cash_in_cumulative_plan,
            cumPlanOut: item.cash_out_cumulative_plan,
            cumActualIn: item.cash_in_cumulative_actual,
            cumActualOut: item.cash_out_cumulative_actual
          }));
          setCashflowDataState(transformedData);
        } else {
          setCashflowDataState([]);
        }
      } catch (error) {
        console.error('Error fetching cashflow data:', error);
        setCashflowDataState([]);
      } finally {
        setIsLoadingCashflow(false);
      }
    };

    fetchCashflowData();
  }, [selectedProject?.title]);

  // Fetch health & safety data when selected project changes
  useEffect(() => {
    const fetchHealthSafetyData = async () => {
      if (!selectedProject?.title) {
        setHealthSafetyData(null);
        return;
      }

      setIsLoadingHealthSafety(true);
      try {
        const response = await healthSafetyApi.getReports({ project_name: selectedProject.title });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          // Get the most recent report
          const latestReport = pickBestRow(rows, (r) =>
            toNum(r?.total_manhours) +
            toNum(r?.fatalities) * 1000000 +
            toNum(r?.significant) * 10000 +
            toNum(r?.major) * 1000 +
            toNum(r?.minor) * 100 +
            toNum(r?.near_miss) * 10
          ) as any;
          setHealthSafetyData({
            fatalities: latestReport.fatalities || 0,
            significant: latestReport.significant || 0,
            major: latestReport.major || 0,
            minor: latestReport.minor || 0,
            nearMiss: latestReport.near_miss || 0,
            totalManhours: latestReport.total_manhours || 0,
            lossOfManhours: 0 // Not available in the model
          });
        } else {
          setHealthSafetyData(null);
        }
      } catch (error) {
        console.error('Error fetching health & safety data:', error);
        setHealthSafetyData(null);
      } finally {
        setIsLoadingHealthSafety(false);
      }
    };

    fetchHealthSafetyData();
  }, [selectedProject?.title]);

  // Fetch project progress data when selected project changes
  useEffect(() => {
    const fetchProjectProgressData = async () => {
      if (!selectedProject?.title) {
        setProjectProgressData([]);
        return;
      }

      setIsLoadingProjectProgress(true);
      try {
        const response = await projectProgressApi.getProjectProgress({ project_name: selectedProject.title });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          // Transform API data to match chart format
          const transformedData = rows.map((item: any) => {
            const date = new Date(item.progress_month);
            const monthStr = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
            return {
              month: monthStr,
              planned: item.cumulative_plan,
              actual: item.cumulative_actual
            };
          });
          setProjectProgressData(transformedData);
        } else {
          setProjectProgressData([]);
        }
      } catch (error) {
        console.error('Error fetching project progress data:', error);
        setProjectProgressData([]);
      } finally {
        setIsLoadingProjectProgress(false);
      }
    };

    fetchProjectProgressData();
  }, [selectedProject?.title]);

  // Fetch invoicing data when selected project changes
  useEffect(() => {
    const fetchInvoicingData = async () => {
      if (!selectedProject?.title) {
        setInvoicingData(null);
        return;
      }

      setIsLoadingInvoicing(true);
      try {
        const role =
          currentUser.role === UserRole.PMC_HEAD ? 'PMC Head' :
            currentUser.role === UserRole.CEO ? 'CEO' :
              currentUser.role === UserRole.BILLING_SITE_ENGINEER ? 'Billing Site Engineer' :
                undefined;
        const response = await invoicingApi.getInvoicing({
          project_name: selectedProject.title,
          ...(role ? { role } : {}),
        });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          // Get the most recent record
          const latestInvoicing = pickBestRow(rows, (r) =>
            toNum(r?.gross_billed) +
            toNum(r?.net_billed_without_vat) +
            toNum(r?.net_collected) +
            toNum(r?.net_due)
          ) as any;
          setInvoicingData({
            grossBilled: toNum(latestInvoicing.gross_billed),
            netBilled: toNum(latestInvoicing.net_billed_without_vat),
            netCollected: toNum(latestInvoicing.net_collected),
            netDue: toNum(latestInvoicing.net_due),
          });
        } else {
          setInvoicingData(null);
        }
      } catch (error) {
        console.error('Error fetching invoicing data:', error);
        setInvoicingData(null);
      } finally {
        setIsLoadingInvoicing(false);
      }
    };

    fetchInvoicingData();
  }, [selectedProject?.title, currentUser.role]);

  // Fetch contracts data when selected project changes
  useEffect(() => {
    const fetchContractsData = async () => {
      if (!selectedProject?.title) {
        setContractsData(null);
        return;
      }

      setIsLoadingContracts(true);
      try {
        // Pass role so PMC Head / CEO can see all contracts (not just approved)
        const role =
          currentUser.role === UserRole.PMC_HEAD ? 'PMC Head' :
            currentUser.role === UserRole.CEO ? 'CEO' :
              undefined;
        const response = await contractsApi.getContracts({ project_name: selectedProject.title, role });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          // Get the most recent contract
          const latestContract = pickBestRow(rows, (r) =>
            toNum(r?.revised_contract_value) +
            toNum(r?.original_contract_value) +
            toNum(r?.approved_vo) +
            toNum(r?.pending_vo)
          ) as any;
          setContractsData({
            original: toNum(latestContract.original_contract_value),
            approvedVO: toNum(latestContract.approved_vo),
            revised: toNum(latestContract.revised_contract_value),
            pendingVO: toNum(latestContract.pending_vo)
          });
        } else {
          setContractsData(null);
        }
      } catch (error) {
        console.error('Error fetching contracts data:', error);
        setContractsData(null);
      } finally {
        setIsLoadingContracts(false);
      }
    };

    fetchContractsData();
  }, [selectedProject?.title, currentUser.role]);

  // Fetch contract performance data when selected project changes
  useEffect(() => {
    const fetchContractPerformanceData = async () => {
      if (!selectedProject?.title) {
        setContractPerformanceData(null);
        return;
      }

      setIsLoadingContractPerformance(true);
      try {
        const role =
          currentUser.role === UserRole.PMC_HEAD ? 'PMC Head' :
            currentUser.role === UserRole.CEO ? 'CEO' :
              currentUser.role === UserRole.BILLING_SITE_ENGINEER ? 'Billing Site Engineer' :
                undefined;
        const response = await contractPerformanceApi.getContractPerformance({
          project_name: selectedProject.title,
          ...(role ? { role } : {}),
        });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          const latestPerformance = pickBestRow(rows, (r) =>
            toNum(r?.contract_value) +
            toNum(r?.earned_value) +
            toNum(r?.actual_billed) +
            Math.abs(toNum(r?.variance))
          ) as any;
          setContractPerformanceData({
            contractValue: toNum(latestPerformance.contract_value),
            earnedValue: toNum(latestPerformance.earned_value),
            actualBilled: toNum(latestPerformance.actual_billed),
            variance: toNum(latestPerformance.variance),
            variancePercent: toNum(latestPerformance.variance_percentage),
          });
        } else {
          setContractPerformanceData(null);
        }
      } catch (error) {
        console.error('Error fetching contract performance data:', error);
        setContractPerformanceData(null);
      } finally {
        setIsLoadingContractPerformance(false);
      }
    };

    fetchContractPerformanceData();
  }, [selectedProject?.title, currentUser.role]);

  // Format date as DD-MMM-YY
  const formatDate = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  const currentDate = formatDate(new Date());

  // Project dates from dashboard data
  const projectDates = {
    start: dashboardData?.project_start_date ? formatDate(new Date(dashboardData.project_start_date)) : 'N/A',
    contractFinish: dashboardData?.contract_finish_date ? formatDate(new Date(dashboardData.contract_finish_date)) : 'N/A',
    forecastFinish: dashboardData?.forecast_finish_date ? formatDate(new Date(dashboardData.forecast_finish_date)) : 'N/A',
    delayDays: dashboardData?.delay_days ?? 0
  };

  // Contract values from contracts API (preferred) or imported dashboard data
  const contractValues = contractsData ? {
    original: toNum(contractsData.original),
    approvedVO: toNum(contractsData.approvedVO),
    revised: toNum(contractsData.revised),
    pendingVO: toNum(contractsData.pendingVO)
  } : {
    original: toNum(dashboardData?.original_contract_value),
    approvedVO: toNum(dashboardData?.approved_vo),
    revised: toNum(dashboardData?.revised_contract_value),
    pendingVO: toNum(dashboardData?.pending_vo)
  };

  const approvedVoPercent =
    contractValues.original > 0
      ? (contractValues.approvedVO / contractValues.original) * 100
      : 0;

  // Invoicing data from invoicing API or dashboard data
  const invoicing = invoicingData
    ? {
      grossBilled: toNum(invoicingData.grossBilled),
      netBilled: toNum(invoicingData.netBilled),
      netCollected: toNum(invoicingData.netCollected),
      netDue: toNum(invoicingData.netDue),
    }
    : {
      grossBilled: toNum(dashboardData?.gross_billed),
      netBilled: toNum(dashboardData?.net_billed),
      netCollected: toNum(dashboardData?.net_collected),
      netDue: toNum(dashboardData?.net_due),
    };

  // Safety stats from health & safety data or dashboard data
  const safetyStats = healthSafetyData ? {
    fatalities: healthSafetyData.fatalities || 0,
    significant: healthSafetyData.significant || 0,
    major: healthSafetyData.major || 0,
    minor: healthSafetyData.minor || 0,
    nearMiss: healthSafetyData.nearMiss || 0,
    totalManhours: healthSafetyData.totalManhours || 0,
    lossOfManhours: healthSafetyData.lossOfManhours || 0
  } : {
    fatalities: dashboardData?.fatalities || 0,
    significant: dashboardData?.significant || 0,
    major: dashboardData?.major || 0,
    minor: dashboardData?.minor || 0,
    nearMiss: dashboardData?.near_miss || 0,
    totalManhours: dashboardData?.total_manhours || 0,
    lossOfManhours: dashboardData?.loss_of_manhours || 0
  };

  const lastCostRow =
    costPerformanceData.length > 0 ? costPerformanceData[costPerformanceData.length - 1] : null;

  const plannedValue =
    toNum(dashboardData?.planned_value) ||
    toNum(contractPerformanceData?.contractValue) ||
    toNum(lastCostRow?.bcws);

  const earnedValue =
    toNum(dashboardData?.earned_value) || toNum(contractPerformanceData?.earnedValue);

  const variance = earnedValue - plannedValue;
  const variancePercent = plannedValue > 0 ? ((earnedValue - plannedValue) / plannedValue) * 100 : 0;
  const earnedPercentOfPlanned = plannedValue > 0 ? (earnedValue / plannedValue) * 100 : 0;

  const bcwp = toNum(dashboardData?.bcwp) || toNum(lastCostRow?.bcwp);
  const ac = toNum(dashboardData?.ac) || toNum(lastCostRow?.acwp);
  const costVariance = bcwp - ac;
  const costVariancePercent = bcwp > 0 ? ((bcwp - ac) / bcwp) * 100 : 0;

  const actualBilled =
    toNum(dashboardData?.actual_billed) || toNum(contractPerformanceData?.actualBilled);
  const billedVariance = earnedValue - actualBilled;
  const billedVariancePercent = earnedValue > 0 ? ((earnedValue - actualBilled) / earnedValue) * 100 : 0;

  const pctOf = (num: number, den: number) =>
    den > 0 && Number.isFinite(num) && Number.isFinite(den) ? (num / den) * 100 : 0;

  const bcwpPctOfPlanned = pctOf(bcwp, plannedValue);
  const acPctOfPlanned = pctOf(ac, plannedValue);
  const earnedPctOfPlanned = pctOf(earnedValue, plannedValue);
  const actualBilledPctOfPlanned = pctOf(actualBilled, plannedValue);
  const cpiGaugePct = pctOf(bcwp, ac);
  const billedToEarnedGaugePct = pctOf(actualBilled, earnedValue);

  // Progress S-Curve data from API or empty array
  const progressSCurveData = projectProgressData.length > 0 ? projectProgressData : [];

  // Cash flow data from API or empty array
  const cashFlowData = cashflowDataState.length > 0 ? cashflowDataState : [];



  // Drawings data
  const drawingsDonutData = [
    { name: 'Planned', value: 90, color: '#4f46e5' },
    { name: 'Actual', value: 10, color: '#f59e0b' }
  ];

  const drawingsBarData = [
    { category: 'As-Built Drawings', planned: 2500, actual: 2250 },
    { category: 'Shop Drawings', planned: 1800, actual: 1620 }
  ];

  const submittalData = [
    { category: 'Material A', planned: 800, actual: 720 },
    { category: 'Material B', planned: 600, actual: 540 }
  ];

  // PO & Delivery Status
  const posiDeliveryData = [
    { category: 'PO-PR', total: 100, shortLead: 60, longLead: 40 },
    { category: 'PO-ACT', total: 95, shortLead: 55, longLead: 40 },
    { category: 'DEL-PL', total: 85, shortLead: 50, longLead: 35 },
    { category: 'DEL-ACT', total: 80, shortLead: 45, longLead: 35 }
  ];

  // Construction progress
  const constructionDonutData = [
    { name: 'Planned', value: 90, color: '#4f46e5' },
    { name: 'Actual', value: 81, color: '#f59e0b' }
  ];

  const constructionBarData = [
    { category: 'Structural Works', planned: 0.75, actual: 0.5 },
    { category: 'MEP', planned: 0.85, actual: 0.75 },
    { category: 'Architecture/Finishes', planned: 0.89, actual: 0.68 }
  ];

  // Quality data
  const rfiData = [
    { name: 'Closed', value: 90, color: '#4f46e5' },
    { name: 'Open', value: 10, color: '#f59e0b' }
  ];

  const wirData = [
    { name: 'Approved', value: 80, color: '#4f46e5' },
    { name: 'Rejected', value: 10, color: '#ef4444' },
    { name: 'Pending', value: 10, color: '#94a3b8' }
  ];

  const ncrData = [
    { name: 'Closed', value: 70, color: '#4f46e5' },
    { name: 'Open', value: 30, color: '#ef4444' }
  ];

  // Manpower data from API or empty array
  const manpowerData = manpowerDataState.length > 0 ? manpowerDataState : [];

  const manpowerDonutData = [
    { name: 'Planned', value: 75, color: '#4f46e5' },
    { name: 'Actual', value: 25, color: '#f59e0b' }
  ];





  if (allProjects.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] text-center p-8 rounded-[3rem] border ${themeClasses.glassCard} ${themeClasses.border}`}>
        <div className={`p-6 rounded-full mb-6 ${themeClasses.bgSecondary}`}>
          <Icons.Project className={`${themeClasses.textMuted}`} size={48} />
        </div>
        <h3 className={`text-xl font-black uppercase tracking-tighter mb-2 ${themeClasses.textPrimary}`}>
          No Projects Available
        </h3>
        <p className={`text-sm font-bold uppercase tracking-widest max-w-md ${themeClasses.textSecondary}`}>
          No projects found in the system. Please contact administrator.
        </p>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] text-center p-8 rounded-[3rem] border ${themeClasses.glassCard} ${themeClasses.border}`}>
        <div className={`p-6 rounded-full mb-6 ${themeClasses.bgSecondary}`}>
          <Icons.Project className={`${themeClasses.textMuted}`} size={48} />
        </div>
        <h3 className={`text-xl font-black uppercase tracking-tighter mb-2 ${themeClasses.textPrimary}`}>
          No Project Selected
        </h3>
        <p className={`text-sm font-bold uppercase tracking-widest max-w-md ${themeClasses.textSecondary}`}>
          Please select a project from the dropdown above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className={`p-6 rounded-2xl border ${themeClasses.glassCard} ${themeClasses.border}`}>
        <div className="flex items-center justify-between mb-4">
          {/* Left: Project Selection Dropdown */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-black text-amber-500 uppercase tracking-widest whitespace-nowrap flex items-center gap-2">
              <Icons.Project size={18} />
              Select:
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className={`px-5 py-3 border-2 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all min-w-[180px] ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.bgHover}`}
            >
              {allProjects.map((project) => {
                // Shorten project title - take first 2-3 words or limit to 20 chars
                const words = project.title.split(' ');
                let shortTitle = words.slice(0, 2).join(' ');
                if (shortTitle.length > 20) {
                  shortTitle = words[0] + (words[1] ? ' ' + words[1].substring(0, 8) : '');
                }
                const displayTitle = shortTitle.length > 20 ? shortTitle.substring(0, 17) + '...' : shortTitle;
                return (
                  <option key={project.id} value={project.id} className={isDarkTheme ? "bg-slate-900" : "bg-white"}>
                    {displayTitle}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Center: Project Name */}
          <div className="flex-1 flex flex-col items-center text-center">
            <p className={`text-lg font-bold uppercase tracking-tight ${themeClasses.textPrimary}`}>
              PROJECT NAME: {selectedProject.title}. {selectedProject.location}.
            </p>
          </div>

          {/* Right: Date */}
          <div className="text-right">
            <p className={`text-sm font-black uppercase ${themeClasses.textPrimary}`}>
              REPORT DATE {currentDate}
            </p>
          </div>
        </div>
      </div>

      {/* TOP ROW - 4 Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
        {/* PROJECT DATES */}
        <div className={`p-0 rounded-2xl border overflow-hidden flex flex-col h-full ${themeClasses.glassCard} ${themeClasses.border}`}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 ${isDarkTheme ? 'bg-blue-900/40 text-rose-400' : 'bg-blue-50 text-rose-600'}`}>PROJECT DATES</h3>
          <div className="p-3 flex-1 flex flex-col">
            {/* Table Format */}
            <div className="mb-2">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className={isDarkTheme ? "bg-blue-900/30" : "bg-blue-50/50"}>
                    <th className={`px-2 py-2 text-left font-black uppercase ${themeClasses.textPrimary}`}>Project Start</th>
                    <th className={`px-2 py-2 text-left font-black uppercase ${themeClasses.textPrimary}`}>Contract Finish</th>
                    <th className={`px-2 py-2 text-left font-black uppercase ${themeClasses.textPrimary}`}>Forecast Finish</th>
                    <th className={`px-2 py-2 text-left font-black uppercase ${themeClasses.textPrimary}`}>Delay (Days)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`px-2 py-2 font-black ${themeClasses.textPrimary}`}>{projectDates.start}</td>
                    <td className={`px-2 py-2 font-black ${themeClasses.textPrimary}`}>{projectDates.contractFinish}</td>
                    <td className={`px-2 py-2 font-black ${themeClasses.textPrimary}`}>{projectDates.forecastFinish}</td>
                    <td className={`px-2 py-2 font-black ${projectDates.delayDays < 0 ? themeClasses.danger : themeClasses.success}`}>
                      {projectDates.delayDays}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-2 text-[9px]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-500 rounded"></div>
                <span className={`font-bold ${themeClasses.textSecondary}`}>Elapsed Duration</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span className={`font-bold ${themeClasses.textSecondary}`}>Remaining Duration</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-rose-500 rounded"></div>
                <span className={`font-bold ${themeClasses.textSecondary}`}>Forecast Finish Duration</span>
              </div>
            </div>

            {/* Timeline Bar */}
            <div className={`relative h-10 rounded-lg overflow-hidden ${isDarkTheme ? 'bg-white/5' : 'bg-gray-100'}`}>
              {/* Elapsed Duration (Yellow) - 703 days */}
              <div
                className="absolute left-0 top-0 h-full bg-amber-500 flex items-center justify-center"
                style={{ width: '79.5%' }}
              >
                <span className="text-[9px] font-black text-white">703</span>
              </div>
              {/* Remaining Duration (Green) - 0 days */}
              <div
                className="absolute left-[79.5%] top-0 h-full bg-emerald-500 flex items-center justify-center"
                style={{ width: '0.5%', minWidth: '2px' }}
              >
                <span className="text-[9px] font-black text-white">0</span>
              </div>
              {/* Forecast Finish Duration (Red) - 181 days */}
              <div
                className="absolute left-[80%] top-0 h-full bg-rose-500 flex items-center justify-center"
                style={{ width: '20%' }}
              >
                <span className="text-[9px] font-black text-white">181</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTRACT VALUES */}
        <div className={`p-0 rounded-2xl border overflow-hidden flex flex-col h-full ${themeClasses.glassCard} ${themeClasses.border}`}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 ${isDarkTheme ? 'bg-blue-900/40 text-rose-400' : 'bg-blue-50 text-rose-600'}`}>CONTRACT VALUES</h3>
          <div className="p-3 flex-1 flex flex-col justify-between">
            <table className="w-full text-[8px] border-collapse">
              <thead>
                <tr className={isDarkTheme ? "bg-blue-900/30" : "bg-blue-50/50"}>
                  <th className={`px-1.5 py-1.5 text-left font-black uppercase border ${themeClasses.textPrimary} ${themeClasses.border}`}>Original Contract Value</th>
                  <th className={`px-1.5 py-1.5 text-left font-black uppercase border ${themeClasses.textPrimary} ${themeClasses.border}`}>Approved VO(S)</th>
                  <th className={`px-1.5 py-1.5 text-left font-black uppercase border ${themeClasses.textPrimary} ${themeClasses.border}`}>Revised/Remeasured Contract Value</th>
                  <th className={`px-1.5 py-1.5 text-left font-black uppercase border ${themeClasses.textPrimary} ${themeClasses.border}`}>Potential/Pending VO(s)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`px-1.5 py-1.5 font-black border ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{contractValues.original.toLocaleString('en-IN')}</td>
                  <td className={`px-1.5 py-1.5 font-black border ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{contractValues.approvedVO.toLocaleString('en-IN')}</td>
                  <td className={`px-1.5 py-1.5 font-black border ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{contractValues.revised.toLocaleString('en-IN')}</td>
                  <td className={`px-1.5 py-1.5 font-black border ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{contractValues.pendingVO.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td className={`px-1.5 py-1.5 border ${themeClasses.border} ${themeClasses.bgSecondary}`}></td>
                  <td className={`px-1.5 py-1.5 font-black border ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{approvedVoPercent.toFixed(0)}%</td>
                  <td className={`px-1.5 py-1.5 border ${themeClasses.border} ${themeClasses.bgSecondary}`}></td>
                  <td className={`px-1.5 py-1.5 border ${themeClasses.border} ${themeClasses.bgSecondary}`}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* INVOICING INFORMATION */}
        <div className={`p-0 rounded-2xl border overflow-hidden flex flex-col h-full ${themeClasses.glassCard} ${themeClasses.border}`}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 ${isDarkTheme ? 'bg-blue-900/40 text-rose-400' : 'bg-blue-50 text-rose-600'}`}>INVOICING INFORMATION</h3>
          <div className="p-3 flex-1 flex flex-col justify-between">
            <table className="w-full text-[8px] border-collapse">
              <thead>
                <tr className={isDarkTheme ? "bg-blue-900/30" : "bg-blue-50/50"}>
                  <th className={`px-1.5 py-1.5 text-left font-black uppercase border ${themeClasses.textPrimary} ${themeClasses.border}`}>Gross Billed</th>
                  <th className={`px-1.5 py-1.5 text-left font-black uppercase border ${themeClasses.textPrimary} ${themeClasses.border}`}>
                    <div>Net Billed</div>
                    <div className="text-[7px]">W/O VAT</div>
                  </th>
                  <th className={`px-1.5 py-1.5 text-left font-black uppercase border ${themeClasses.textPrimary} ${themeClasses.border}`}>Net Collected</th>
                  <th className={`px-1.5 py-1.5 text-left font-black uppercase border ${themeClasses.textPrimary} ${themeClasses.border}`}>Net Due</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`px-1.5 py-1.5 font-black border ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{invoicing.grossBilled.toLocaleString('en-IN')}</td>
                  <td className={`px-1.5 py-1.5 font-black border ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{invoicing.netBilled.toLocaleString('en-IN')}</td>
                  <td className={`px-1.5 py-1.5 font-black border ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{invoicing.netCollected.toLocaleString('en-IN')}</td>
                  <td className={`px-1.5 py-1.5 font-black border ${themeClasses.danger} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{invoicing.netDue.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* HEALTH & SAFETY STATUS */}
        <div className={`p-0 rounded-xl border overflow-hidden ${themeClasses.glassCard} ${themeClasses.border}`}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 ${isDarkTheme ? 'bg-blue-900/40 text-white' : 'bg-blue-50 text-blue-900'}`}>HEALTH & SAFETY STATUS</h3>
          <div className="p-3">
            <SafetyPyramid stats={safetyStats} />
            <div className={`mt-2 space-y-1 pt-2 border-t ${themeClasses.border}`}>
              <div className="flex justify-between text-[10px]">
                <span className={`font-bold ${themeClasses.textSecondary}`}>TOTAL PROJECT MANHOURS:</span>
                <span className={`font-black ${themeClasses.textPrimary}`}>{safetyStats.totalManhours.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className={`font-bold ${themeClasses.textSecondary}`}>LOSS OF MANHOURS:</span>
                <span className={`font-black ${themeClasses.danger}`}>{safetyStats.lossOfManhours.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION BETWEEN PROJECT DATES AND DRAWINGS - 4 Column Layout */}
      <div className="mt-2 grid grid-cols-1 lg:grid-cols-4 gap-2">
        {/* PLANNED VS EARNED VALUE */}
        <div className={`p-0 rounded-xl border overflow-hidden min-h-[248px] ${themeClasses.glassCard} ${themeClasses.border}`}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 ${isDarkTheme ? 'bg-blue-900/40 text-white' : 'bg-blue-50 text-blue-900'}`}>PLANNED VS EARNED VALUE</h3>
          <div className="p-3">
            <div className="flex flex-col sm:flex-row gap-1.5 h-full items-start">
              <div className="space-y-1 flex-shrink-0 flex justify-center flex-col">
                <table className="text-[8px] border-collapse w-auto">
                  <thead>
                    <tr className={isDarkTheme ? "bg-blue-900/30" : "bg-blue-50/50"}>
                      <th className={`px-1 py-1 text-left font-black uppercase border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border}`}>Metric</th>
                      <th className={`px-1 py-1 text-left font-black uppercase border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border}`}>Amount</th>
                      <th className={`px-1 py-1 text-left font-black uppercase border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border}`}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>Planned Value</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{plannedValue.toLocaleString('en-IN')}</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>100.00%</td>
                    </tr>
                    <tr>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>Earned Value</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.success} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{earnedValue.toLocaleString('en-IN')}</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.success} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{earnedPercentOfPlanned.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>Variance</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.border} ${themeClasses.bgSecondary} ${variance >= 0 ? themeClasses.success : themeClasses.danger}`}>
                        {variance.toLocaleString('en-IN')}
                      </td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.border} ${themeClasses.bgSecondary} ${variance >= 0 ? themeClasses.success : themeClasses.danger}`}>
                        {variancePercent.toFixed(2)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex justify-center items-center sm:justify-start min-h-[112px]">
                <GaugeChart value={earnedPercentOfPlanned} maxValue={100} />
              </div>
            </div>
          </div>
        </div>

        {/* INTERNAL COST PERFORMANCE */}
        <div className={`p-0 rounded-xl border overflow-hidden min-h-[248px] ${themeClasses.glassCard} ${themeClasses.border}`}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 ${isDarkTheme ? 'bg-blue-900/40 text-white' : 'bg-blue-50 text-blue-900'}`}>INTERNAL COST PERFORMANCE</h3>
          <div className="p-3">
            <div className="flex flex-col sm:flex-row gap-1.5 h-full items-start">
              <div className="space-y-1 flex-shrink-0 flex justify-center flex-col">
                <table className="text-[8px] border-collapse w-auto">
                  <thead>
                    <tr className={isDarkTheme ? "bg-blue-900/30" : "bg-blue-50/50"}>
                      <th className={`px-1 py-1 text-left font-black uppercase border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border}`}>Metric</th>
                      <th className={`px-1 py-1 text-left font-black uppercase border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border}`}>Amount</th>
                      <th className={`px-1 py-1 text-left font-black uppercase border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border}`}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>BCWP</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{bcwp.toLocaleString('en-IN')}</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{bcwpPctOfPlanned.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>AC</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{ac.toLocaleString('en-IN')}</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{acPctOfPlanned.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>Variance</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.border} ${themeClasses.bgSecondary} ${costVariance >= 0 ? themeClasses.success : themeClasses.danger}`}>
                        {costVariance.toLocaleString('en-IN')}
                      </td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.border} ${themeClasses.bgSecondary} ${costVariance >= 0 ? themeClasses.success : themeClasses.danger}`}>
                        {costVariancePercent.toFixed(2)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex justify-center items-center sm:justify-start min-h-[112px]">
                <GaugeChart value={cpiGaugePct} maxValue={100} />
              </div>
            </div>
          </div>
        </div>

        {/* CONTRACT PERFORMANCE */}
        <div className={`p-0 rounded-xl border overflow-hidden min-h-[248px] ${themeClasses.glassCard} ${themeClasses.border}`}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 ${isDarkTheme ? 'bg-blue-900/40 text-white' : 'bg-blue-50 text-blue-900'}`}>CONTRACT PERFORMANCE</h3>
          <div className="p-3">
            <div className="flex flex-col sm:flex-row gap-1.5 h-full items-start">
              <div className="space-y-1 flex-shrink-0 flex justify-center flex-col">
                <table className="text-[8px] border-collapse w-auto">
                  <thead>
                    <tr className={isDarkTheme ? "bg-blue-900/30" : "bg-blue-50/50"}>
                      <th className={`px-1 py-1 text-left font-black uppercase border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border}`}>Metric</th>
                      <th className={`px-1 py-1 text-left font-black uppercase border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border}`}>Amount</th>
                      <th className={`px-1 py-1 text-left font-black uppercase border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border}`}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>Earned Value</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{earnedValue.toLocaleString('en-IN')}</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{earnedPctOfPlanned.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>Actual Billed</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.accent} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{actualBilled.toLocaleString('en-IN')}</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.accent} ${themeClasses.border} ${themeClasses.bgSecondary}`}>{actualBilledPctOfPlanned.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.textPrimary} ${themeClasses.border} ${themeClasses.bgSecondary}`}>Variance</td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.border} ${themeClasses.bgSecondary} ${billedVariance >= 0 ? themeClasses.success : themeClasses.danger}`}>
                        {billedVariance.toLocaleString('en-IN')}
                      </td>
                      <td className={`px-1 py-1 font-black border whitespace-nowrap ${themeClasses.border} ${themeClasses.bgSecondary} ${billedVariance >= 0 ? themeClasses.success : themeClasses.danger}`}>
                        {billedVariancePercent.toFixed(2)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex justify-center items-center sm:justify-start min-h-[112px]">
                <GaugeChart value={billedToEarnedGaugePct} maxValue={100} />
              </div>
            </div>
          </div>
        </div>

        {/* PROJECT QUALITY STATUS */}
        <div className={`p-3 rounded-xl border min-h-[248px] flex flex-col ${themeClasses.glassCard} ${themeClasses.border}`}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest mb-2 ${themeClasses.textSecondary}`}>PROJECT QUALITY STATUS</h3>
          <div className="grid grid-cols-3 gap-2 flex-1 items-center">
            <DonutChart data={rfiData} label="RFI(s)" size={90} showLabels={false} />
            <DonutChart data={wirData} label="WIR(s)" size={90} showLabels={false} />
            <DonutChart data={ncrData} label="NCR(s)" size={90} showLabels={false} />
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mt-2">
        {/* LEFT COLUMN */}
        <div className="space-y-2">
          {/* Drawings */}
          <FullScreenCard title="Drawings">
            <div className={`p-3 rounded-xl border ${themeClasses.glassCard} ${themeClasses.border}`}>
              <h3 className={`text-[10px] font-black uppercase tracking-widest mb-2 ${themeClasses.textSecondary}`}>Drawings</h3>
              <DonutChart data={drawingsDonutData} label="Drawings" size={120} />
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className={`text-[10px] font-black uppercase mb-2 ${themeClasses.textSecondary}`}>Submittal Submittal</h4>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={drawingsBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                      <XAxis dataKey="category" tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 8 }} />
                      <YAxis tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 8 }} domain={[0, 3000]} />
                      <Tooltip contentStyle={{ background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '0.5rem', fontSize: '10px', color: isDarkTheme ? '#fff' : '#000' }} />
                      <Bar dataKey="planned" fill="#4f46e5" name="Planned" />
                      <Bar dataKey="actual" fill="#f59e0b" name="Actual" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className={`text-[10px] font-black uppercase mb-2 ${themeClasses.textSecondary}`}>Approval</h4>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={submittalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                      <XAxis dataKey="category" tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 8 }} />
                      <YAxis tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 8 }} domain={[0, 900]} />
                      <Tooltip contentStyle={{ background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '0.5rem', fontSize: '10px', color: isDarkTheme ? '#fff' : '#000' }} />
                      <Bar dataKey="planned" fill="#4f46e5" name="Planned" />
                      <Bar dataKey="actual" fill="#f59e0b" name="Actual" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </FullScreenCard>

          {/* PO(s) & Delivery Status */}
          <FullScreenCard title="PO(s) & Delivery Status">
            <div className={`p-5 rounded-2xl border ${themeClasses.glassCard} ${themeClasses.border}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>PO(s) & Delivery Status</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={posiDeliveryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                  <XAxis dataKey="category" tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 8 }} />
                  <YAxis tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 8 }} />
                  <Tooltip contentStyle={{ background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '0.5rem', color: isDarkTheme ? '#fff' : '#000' }} />
                  <Legend wrapperStyle={{ fontSize: '9px' }} />
                  <Bar dataKey="total" fill="#4f46e5" name="Total" />
                  <Bar dataKey="shortLead" fill="#10b981" name="Short Lead" />
                  <Bar dataKey="longLead" fill="#f59e0b" name="Long Lead" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FullScreenCard>

          {/* CONSTRUCTION PROGRESS */}
          <FullScreenCard title="Construction Progress">
            <div className={`p-5 rounded-2xl border ${themeClasses.glassCard} ${themeClasses.border}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>CONSTRUCTION PROGRESS</h3>
              <DonutChart data={constructionDonutData} label="Construction" size={120} />
              <div className="mt-4 space-y-3">
                {constructionBarData.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className={`${themeClasses.textSecondary}`}>{item.category}</span>
                      <div className="flex gap-2">
                        <span className="text-blue-400">Planned: {(item.planned * 100).toFixed(0)}%</span>
                        <span className="text-orange-400">Actual: {(item.actual * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className={`h-4 rounded overflow-hidden ${themeClasses.bgSecondary}`}>
                      <div className="h-full bg-blue-500" style={{ width: `${item.planned * 100}%` }}></div>
                      <div className="h-full bg-orange-500 -mt-4" style={{ width: `${item.actual * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FullScreenCard>
        </div>

        {/* MIDDLE COLUMN */}
        <div className="space-y-4">
          {/* PROJECT PROGRESS STATUS */}
          <FullScreenCard title="Project Progress Status">
            <div className={`p-5 rounded-2xl border mt-4 ${themeClasses.glassCard} ${themeClasses.border}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>PROJECT PROGRESS STATUS</h3>
              <h4 className={`text-[10px] font-black uppercase mb-3 ${themeClasses.textSecondary}`}>PROGRESS S-CURVE</h4>
              {isLoadingProjectProgress ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className={`${themeClasses.textMuted} text-sm`}>Loading project progress data...</div>
                </div>
              ) : progressSCurveData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressSCurveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                    <XAxis dataKey="month" tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 9 }} />
                    <YAxis tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 9 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '0.5rem', color: isDarkTheme ? '#fff' : '#000' }} />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                    <Line type="monotone" dataKey="planned" stroke="#f59e0b" strokeWidth={2} name="Program - Cumulative Plan" />
                    <Line type="monotone" dataKey="actual" stroke="#eab308" strokeWidth={2} name="Cumulative Actual" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <div className={`${themeClasses.textMuted} text-sm`}>No project progress data available for this project</div>
                </div>
              )}
            </div>
          </FullScreenCard>

          {/* CASH-IN VS CASH-OUT */}
          <FullScreenCard title="Cash-in vs Cash-out">
            <div className={`p-5 rounded-2xl border ${themeClasses.glassCard} ${themeClasses.border}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>CASH-IN VS CASH-OUT</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                  <XAxis dataKey="month" tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 9 }} />
                  <YAxis tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '0.5rem', color: isDarkTheme ? '#fff' : '#000' }} />
                  <Legend wrapperStyle={{ fontSize: '9px' }} />
                  <Bar dataKey="cashIn" fill="#4f46e5" name="Cash-In Monthly Actual" />
                  <Bar dataKey="cashOut" fill="#f59e0b" name="Cash-Out Monthly Actual" />
                  <Line type="monotone" dataKey="cumPlanIn" stroke="#eab308" strokeWidth={2} name="Cash-In Cumulative Plan" />
                  <Line type="monotone" dataKey="cumPlanOut" stroke="#10b981" strokeWidth={2} name="Cash-Out Cumulative Plan" />
                  <Line type="monotone" dataKey="cumActualIn" stroke="#eab308" strokeWidth={2} strokeDasharray="5 5" name="Cash-In Cumulative Actual" />
                  <Line type="monotone" dataKey="cumActualOut" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Cash-Out Cumulative Actual" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </FullScreenCard>

          {/* PROJECT COST PERFORMANCE */}
          <FullScreenCard title="Project Cost Performance">
            <div className={`p-5 rounded-2xl border ${themeClasses.glassCard} ${themeClasses.border}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>PROJECT COST PERFORMANCE</h3>
              {isLoadingCostPerformance ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className={`${themeClasses.textMuted} text-sm`}>Loading cost performance data...</div>
                </div>
              ) : costPerformanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={costPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                    <XAxis dataKey="month" tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 9 }} />
                    <YAxis tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '0.5rem', color: isDarkTheme ? '#fff' : '#000' }} />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                    <Line type="monotone" dataKey="bcws" stroke="#4f46e5" strokeWidth={2} name="BCWS" />
                    <Line type="monotone" dataKey="bcwp" stroke="#f59e0b" strokeWidth={2} name="BCWP" />
                    <Line type="monotone" dataKey="acwp" stroke="#ef4444" strokeWidth={2} name="ACWP" />
                    <Line type="monotone" dataKey="fcst" stroke="#10b981" strokeWidth={2} name="FCST" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <div className={`${themeClasses.textMuted} text-sm`}>No cost performance data available for this project</div>
                </div>
              )}
            </div>
          </FullScreenCard>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* PROJECT MANPOWER HISTOGRAM */}
          <FullScreenCard title="Project Manpower Histogram">
            <div className={`p-5 rounded-2xl border ${themeClasses.glassCard} ${themeClasses.border}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>PROJECT MANPOWER HISTOGRAM</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={manpowerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 8 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 8 }} />
                  <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem' }} />
                  <Legend wrapperStyle={{ fontSize: '9px' }} />
                  <Line type="monotone" dataKey="planned" stroke="#f59e0b" strokeWidth={2} name="Total Manpower" />
                  <Line type="monotone" dataKey="actual" stroke="#eab308" strokeWidth={2} name="Total Manpower Actual" />
                </LineChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <DonutChart data={manpowerDonutData} label="Total Manpower" size={80} showLabels={false} />
                <DonutChart data={manpowerDonutData} label="Total Direct & Indirect" size={80} showLabels={false} />
                <DonutChart data={manpowerDonutData} label="T&C Manpower" size={80} showLabels={false} />
              </div>
            </div>
          </FullScreenCard>

          {/* PHOTO-1 */}
          <div className={`p-5 rounded-2xl border flex items-center justify-center min-h-[200px] ${themeClasses.glassCard} ${themeClasses.border}`}>
            <div className={`w-full h-full border-2 border-dashed rounded-xl flex items-center justify-center ${themeClasses.bgSecondary} ${themeClasses.border}`}>
              <span className={`text-lg font-black uppercase ${themeClasses.textMuted}`}>PHOTO-1</span>
            </div>
          </div>

          {/* PHOTO-2 */}
          <div className={`p-5 rounded-2xl border flex items-center justify-center min-h-[200px] ${themeClasses.glassCard} ${themeClasses.border}`}>
            <div className={`w-full h-full border-2 border-dashed rounded-xl flex items-center justify-center ${themeClasses.bgSecondary} ${themeClasses.border}`}>
              <span className={`text-lg font-black uppercase ${themeClasses.textMuted}`}>PHOTO-2</span>
            </div>
          </div>

          {/* MANPOWER DONUT CHARTS */}
          <div className={`p-5 rounded-2xl border ${themeClasses.glassCard} ${themeClasses.border} ${themeClasses.bgSecondary}`}>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <h4 className={`text-[10px] font-black uppercase mb-2 ${themeClasses.textPrimary}`}>Total Manpower</h4>
                <DonutChart data={manpowerDonutData} label="Total Manpower" size={90} showLabels={false} />
              </div>
              <div className="flex flex-col items-center">
                <h4 className={`text-[10px] font-black uppercase mb-2 ${themeClasses.textPrimary}`}>Total Direct & Indirect</h4>
                <DonutChart data={manpowerDonutData} label="Total Direct & Indirect" size={90} showLabels={false} />
              </div>
              <div className="flex flex-col items-center">
                <h4 className={`text-[10px] font-black uppercase mb-2 ${themeClasses.textPrimary}`}>TCC Manpower</h4>
                <DonutChart data={manpowerDonutData} label="TCC Manpower" size={90} showLabels={false} />
              </div>
            </div>
          </div>

          {/* PROJECT EQUIPMENT TABLE */}
          <div className={`p-0 rounded-2xl border overflow-hidden ${themeClasses.glassCard} ${themeClasses.border}`}>
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr className={isDarkTheme ? "bg-blue-900" : "bg-blue-600"}>
                  <th className={`px-3 py-2.5 text-left font-black text-white uppercase border ${isDarkTheme ? 'border-white/20' : 'border-blue-400'}`}></th>
                  <th className={`px-3 py-2.5 text-center font-black text-white uppercase border ${isDarkTheme ? 'border-white/20' : 'border-blue-400'}`}>Planned</th>
                  <th className={`px-3 py-2.5 text-center font-black text-white uppercase border ${isDarkTheme ? 'border-white/20' : 'border-blue-400'}`}>Actual</th>
                  <th className={`px-3 py-2.5 text-center font-black text-white uppercase border ${isDarkTheme ? 'border-white/20' : 'border-blue-400'}`}>Variance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`px-3 py-2.5 font-black border ${themeClasses.textPrimary} ${themeClasses.bgSecondary} ${themeClasses.border}`}>Thabat</td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                </tr>
                <tr>
                  <td className={`px-3 py-2.5 font-black border ${themeClasses.textPrimary} ${themeClasses.bgSecondary} ${themeClasses.border}`}>Supplier</td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                </tr>
                <tr>
                  <td className={`px-3 py-2.5 font-black border ${themeClasses.textPrimary} ${themeClasses.bgSecondary} ${themeClasses.border}`}>Subcon</td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                </tr>
                <tr>
                  <td className={`px-3 py-2.5 font-black border ${themeClasses.textPrimary} ${themeClasses.bgSecondary} ${themeClasses.border}`}>Total</td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                  <td className={`px-3 py-2.5 text-center border ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className={`px-3 py-3 text-center ${isDarkTheme ? "bg-blue-900" : "bg-blue-600"}`}>
                    <span className="text-sm font-black uppercase text-white tracking-wide">PROJECT EQUIPMENT</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ISSUES/CONCERNS */}
        <div className={`p-0 rounded-2xl border overflow-hidden ${themeClasses.glassCard} ${themeClasses.border}`}>
          <div className={`px-4 py-3 ${isDarkTheme ? "bg-blue-900" : "bg-blue-600"}`}>
            <h3 className="text-sm font-black uppercase text-white tracking-wide">ISSUES/CONCERNS</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody>
                {Array.from({ length: 13 }).map((_, index) => (
                  <tr key={index} className={`border-b ${themeClasses.border}`}>
                    <td className={`px-4 py-3 text-[10px] border-r ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                    <td className={`px-4 py-3 text-[10px] ${themeClasses.bgSecondary}`}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RISKS/ACTIONS */}
        <div className={`p-0 rounded-2xl border overflow-hidden ${themeClasses.glassCard} ${themeClasses.border}`}>
          <div className={`px-4 py-3 ${isDarkTheme ? "bg-blue-900" : "bg-blue-600"}`}>
            <h3 className="text-sm font-black uppercase text-white tracking-wide">RISKS/ACTIONS</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody>
                {Array.from({ length: 13 }).map((_, index) => (
                  <tr key={index} className={`border-b ${themeClasses.border}`}>
                    <td className={`px-4 py-3 text-[10px] border-r ${themeClasses.bgSecondary} ${themeClasses.border}`}></td>
                    <td className={`px-4 py-3 text-[10px] ${themeClasses.bgSecondary}`}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BUDGET VS COST PERFORMANCE */}
        <div className={`p-5 rounded-2xl border ${themeClasses.glassCard} ${themeClasses.border}`}>
          <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>BUDGET VS COST PERFORMANCE</h3>
          {isLoadingBudgetPerformance ? (
            <div className="flex items-center justify-center h-[200px]">
              <div className={`${themeClasses.textMuted} text-sm`}>Loading budget performance data...</div>
            </div>
          ) : budgetPerformanceData ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={`${themeClasses.textSecondary}`}>Budget at completion:</span>
                <span className={`font-black ${themeClasses.textPrimary}`}>{formatINR(budgetPerformanceData.bac)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={`${themeClasses.textSecondary}`}>Estimate at completion:</span>
                <span className={`font-black text-amber-500`}>{formatINR(budgetPerformanceData.eac)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={`${themeClasses.textSecondary}`}>Estimate to Go:</span>
                <span className={`font-black ${themeClasses.textPrimary}`}>{formatINR(budgetPerformanceData.etg)}</span>
              </div>
              <div className={`flex justify-between text-sm pt-2 border-t ${themeClasses.border}`}>
                <span className={`${themeClasses.textSecondary}`}>Cost Variance at Completion:</span>
                <span className={`font-black ${budgetPerformanceData.vac >= 0 ? themeClasses.success : themeClasses.danger}`}>
                  {formatINR(budgetPerformanceData.vac)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={`${themeClasses.textSecondary}`}>Cost Variance at to-Date:</span>
                <span className={`font-black ${budgetPerformanceData.cv >= 0 ? themeClasses.success : themeClasses.danger}`}>
                  {formatINR(budgetPerformanceData.cv)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px]">
              <div className={`${themeClasses.textMuted} text-sm`}>No budget performance data available for this project</div>
            </div>
          )}
        </div>

        {/* PROJECT EQUIPMENT */}
        <div className={`p-5 rounded-2xl border ${themeClasses.glassCard} ${themeClasses.border}`}>
          <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>PROJECT EQUIPMENT</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-left text-[9px]">
              <thead>
                <tr className={`border-b ${themeClasses.border}`}>
                  <th className={`px-2 py-1 font-black uppercase ${themeClasses.textMuted}`}>Thabat</th>
                  <th className={`px-2 py-1 font-black uppercase ${themeClasses.textMuted}`}>Supplier</th>
                  <th className={`px-2 py-1 font-black uppercase ${themeClasses.textMuted}`}>Subcon</th>
                  <th className={`px-2 py-1 font-black uppercase ${themeClasses.textMuted}`}>Total</th>
                  <th className={`px-2 py-1 font-black uppercase ${themeClasses.textMuted}`}>Planned</th>
                  <th className={`px-2 py-1 font-black uppercase ${themeClasses.textMuted}`}>Actual</th>
                  <th className={`px-2 py-1 font-black uppercase ${themeClasses.textMuted}`}>Variance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className={`px-2 py-4 text-center ${themeClasses.textMuted} text-[9px]`}>No data available</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={equipmentDataState}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
              <XAxis dataKey="category" tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 8 }} />
              <YAxis tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 8 }} />
              <Tooltip contentStyle={{ background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '0.5rem', color: isDarkTheme ? '#fff' : '#000' }} />
              <Legend wrapperStyle={{ fontSize: '9px' }} />
              <Bar dataKey="planned" fill="#4f46e5" name="Planned" />
              <Bar dataKey="actual" fill="#f59e0b" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Projects;
