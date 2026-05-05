
import React, { useState, useEffect } from 'react';
import { User, UserRole, Project, ProjectStatus, DPR } from '../types';
import { Icons } from './Icons';
import { STATUS_COLORS } from '../constants';
import { formatINR } from '../App';
import DPRSubmissionForm from './DPRSubmissionForm';
import { useTheme, getThemeClasses } from '../utils/theme';
import { contractsApi, invoicingApi, costPerformanceApi, contractPerformanceApi, projectProgressApi, manpowerApi, cashflowApi, unwrapList, toNum } from '../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
  LineChart, Line, Legend, ComposedChart
} from 'recharts';

// Specialized Gauge Component for SPI/CPI
const PerformanceGauge: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const angle = (value / 2) * 180; // Simple mapping for 0-2 range
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 sm:w-36 sm:h-18 md:w-40 md:h-20 overflow-hidden">
        <div className={`absolute inset-0 w-full h-[200%] rounded-full border-[10px] md:border-[12px] ${isDarkTheme ? 'border-white/5' : 'border-gray-100'}`}></div>
        <div
          className="absolute inset-0 w-full h-[200%] rounded-full border-[10px] md:border-[12px] transition-all duration-1000"
          style={{
            borderColor: color,
            clipPath: `polygon(50% 50%, 0 100%, 0 0, 100% 0, 100% 100%)`,
            transform: `rotate(${angle - 90}deg)`
          }}
        ></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className={`text-lg md:text-xl font-black ${themeClasses.textPrimary}`}>{value.toFixed(2)}</span>
        </div>
      </div>
      <span className={`text-[9px] md:text-[10px] font-black uppercase mt-2 tracking-widest text-center ${themeClasses.textSecondary}`}>{label}</span>
    </div>
  );
};

// Safety Pyramid Component
const SafetyPyramid: React.FC<{ stats: Project['safety'] }> = ({ stats }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  if (!stats) return null;
  const tiers = [
    { label: 'Fatalities', count: stats.fatalities, color: 'bg-slate-900', textColor: 'text-white' },
    { label: 'Significant', count: stats.significant, color: 'bg-rose-600', textColor: 'text-white' },
    { label: 'Major', count: stats.major, color: 'bg-rose-400', textColor: 'text-white' },
    { label: 'Minor', count: stats.minor, color: 'bg-amber-400', textColor: 'text-slate-900' },
    { label: 'Near Miss', count: stats.nearMiss, color: 'bg-emerald-400', textColor: 'text-slate-900' },
  ];

  return (
    <div className="flex flex-col items-center space-y-1 w-full max-w-xs mx-auto">
      {tiers.map((tier, idx) => (
        <div
          key={idx}
          className={`${tier.color} ${tier.textColor} px-4 py-2 text-center font-black rounded-lg transition-transform hover:scale-105 cursor-default shadow-sm`}
          style={{ width: `${40 + (idx * 15)}%`, fontSize: '10px' }}
        >
          {tier.label}: {tier.count}
        </div>
      ))}
    </div>
  );
};

const sCurveData = [
  { name: 'Month 1', planned: 5, actual: 4 },
  { name: 'Month 2', planned: 12, actual: 10 },
  { name: 'Month 3', planned: 25, actual: 22 },
  { name: 'Month 4', planned: 45, actual: 40 },
  { name: 'Month 5', planned: 70, actual: 62 },
  { name: 'Month 6', planned: 90, actual: 80 },
];

export type StatType = 'portfolio' | 'dprs' | 'attention' | 'utilization' | 'tasks' | 'docs' | 'execution';

interface DashboardProps {
  user: User;
  projects: Project[];
  dprs: DPR[];
  projectDocuments?: any[];
  onViewProject: (id: string) => void;
  onReviewProjects: () => void;
  onStatClick: (type: StatType) => void;
  onSubmitDPR: (data: { projectId: string; date: string; workDescription: string; manpower: number }) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, projects, dprs, projectDocuments = [], onViewProject, onReviewProjects, onStatClick, onSubmitDPR }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [isDPRModalOpen, setIsDPRModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [contractData, setContractData] = useState<any>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  const [invoicingData, setInvoicingData] = useState<any>(null);
  const [isLoadingInvoicing, setIsLoadingInvoicing] = useState(false);
  const [costPerformanceData, setCostPerformanceData] = useState<any>(null);
  const [isLoadingCostPerformance, setIsLoadingCostPerformance] = useState(false);
  const [contractPerformanceData, setContractPerformanceData] = useState<any>(null);
  const [isLoadingContractPerformance, setIsLoadingContractPerformance] = useState(false);
  const [projectProgressData, setProjectProgressData] = useState<any>(null);
  const [isLoadingProjectProgress, setIsLoadingProjectProgress] = useState(false);
  const [manpowerData, setManpowerData] = useState<any>(null);
  const [isLoadingManpower, setIsLoadingManpower] = useState(false);
  const [cashflowData, setCashflowData] = useState<any[]>([]);
  const [isLoadingCashflow, setIsLoadingCashflow] = useState(false);

  // For PMC Head, use selected project; for Team Lead, use first project
  const leadProject = user.role === UserRole.PMC_HEAD
    ? projects.find(p => p.id === selectedProjectId) || projects[0]
    : projects[0];

  if ((user.role === UserRole.TEAM_LEAD || user.role === UserRole.PMC_HEAD) && !leadProject) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] text-center p-8 rounded-[3rem] border ${themeClasses.glassCard} ${themeClasses.border}`}>
        <div className={`p-6 rounded-full mb-6 ${themeClasses.bgSecondary}`}>
          <Icons.Project className={`${themeClasses.textMuted}`} size={48} />
        </div>
        <h3 className={`text-xl font-black uppercase tracking-tighter mb-2 ${themeClasses.textPrimary}`}>No Projects Found</h3>
        <p className={`text-sm font-bold uppercase tracking-widest max-w-md ${themeClasses.textSecondary}`}>
          {user.role === UserRole.PMC_HEAD
            ? "You haven't created any projects yet. Go to Portfolio to create your first project."
            : "You are currently logged in as Team Lead, but no active projects were found in your portfolio."
          }
        </p>
      </div>
    );
  }

  // Check if user is PMC Head or Team Lead
  const isPmcHeadOrTeamLead = user.role === UserRole.PMC_HEAD || user.role === UserRole.TEAM_LEAD;
  const isPMCHead = user.role === UserRole.PMC_HEAD;

  // Set default selected project for PMC Head on first load
  useEffect(() => {
    if (isPMCHead && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [isPMCHead, projects, selectedProjectId]);

  // Fetch contract data when selected project changes
  useEffect(() => {
    const fetchContractData = async () => {
      if (!leadProject?.title) {
        setContractData(null);
        return;
      }

      setIsLoadingContract(true);
      try {
        const role =
          user.role === UserRole.PMC_HEAD ? 'PMC Head' :
          user.role === UserRole.CEO ? 'CEO' :
          undefined;
        const response = await contractsApi.getContracts({ project_name: leadProject.title, role });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          setContractData(rows[0]);
        } else {
          setContractData(null);
        }
      } catch (error) {
        console.error('Error fetching contract data:', error);
        setContractData(null);
      } finally {
        setIsLoadingContract(false);
      }
    };

    fetchContractData();
  }, [leadProject?.title, user.role]);

  // Fetch invoicing data when selected project changes
  useEffect(() => {
    const fetchInvoicingData = async () => {
      if (!leadProject?.title) {
        setInvoicingData(null);
        return;
      }

      setIsLoadingInvoicing(true);
      try {
        const role =
          user.role === UserRole.PMC_HEAD ? 'PMC Head' :
          user.role === UserRole.CEO ? 'CEO' :
          user.role === UserRole.BILLING_SITE_ENGINEER ? 'Billing Site Engineer' :
          undefined;
        const response = await invoicingApi.getInvoicing({
          project_name: leadProject.title,
          ...(role ? { role } : {}),
        });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          const row = rows[0] as any;
          setInvoicingData({
            ...row,
            gross_billed: toNum(row.gross_billed),
            net_billed_without_vat: toNum(row.net_billed_without_vat),
            net_collected: toNum(row.net_collected),
            net_due: toNum(row.net_due),
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
  }, [leadProject?.title, user.role]);

  // Fetch cost performance data when selected project changes
  useEffect(() => {
    const fetchCostPerformanceData = async () => {
      if (!leadProject?.title) {
        setCostPerformanceData(null);
        return;
      }

      setIsLoadingCostPerformance(true);
      try {
        const response = await costPerformanceApi.getCostPerformance({ project_name: leadProject.title });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          setCostPerformanceData(rows[0]);
        } else {
          setCostPerformanceData(null);
        }
      } catch (error) {
        console.error('Error fetching cost performance data:', error);
        setCostPerformanceData(null);
      } finally {
        setIsLoadingCostPerformance(false);
      }
    };

    fetchCostPerformanceData();
  }, [leadProject?.title]);

  // Fetch contract performance data when selected project changes
  useEffect(() => {
    const fetchContractPerformanceData = async () => {
      if (!leadProject?.title) {
        setContractPerformanceData(null);
        return;
      }

      setIsLoadingContractPerformance(true);
      try {
        const role =
          user.role === UserRole.PMC_HEAD ? 'PMC Head' :
          user.role === UserRole.CEO ? 'CEO' :
          user.role === UserRole.BILLING_SITE_ENGINEER ? 'Billing Site Engineer' :
          undefined;
        const response = await contractPerformanceApi.getContractPerformance({
          project_name: leadProject.title,
          ...(role ? { role } : {}),
        });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          setContractPerformanceData(rows[0]);
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
  }, [leadProject?.title, user.role]);

  // Fetch project progress data when selected project changes
  useEffect(() => {
    const fetchProjectProgressData = async () => {
      if (!leadProject?.title) {
        setProjectProgressData(null);
        return;
      }

      setIsLoadingProjectProgress(true);
      try {
        const response = await projectProgressApi.getProjectProgress({ project_name: leadProject.title });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          setProjectProgressData(rows[0]);
        } else {
          setProjectProgressData(null);
        }
      } catch (error) {
        console.error('Error fetching project progress data:', error);
        setProjectProgressData(null);
      } finally {
        setIsLoadingProjectProgress(false);
      }
    };

    fetchProjectProgressData();
  }, [leadProject?.title]);

  // Fetch manpower data when selected project changes
  useEffect(() => {
    const fetchManpowerData = async () => {
      if (!leadProject?.title) {
        setManpowerData(null);
        return;
      }

      setIsLoadingManpower(true);
      try {
        const response = await manpowerApi.getManpower({ project_name: leadProject.title });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          setManpowerData(rows[0]);
        } else {
          setManpowerData(null);
        }
      } catch (error) {
        console.error('Error fetching manpower data:', error);
        setManpowerData(null);
      } finally {
        setIsLoadingManpower(false);
      }
    };

    fetchManpowerData();
  }, [leadProject?.title]);

  // Fetch cashflow data when selected project changes
  useEffect(() => {
    const fetchCashflowData = async () => {
      if (!leadProject?.title) {
        setCashflowData([]);
        return;
      }

      setIsLoadingCashflow(true);
      try {
        const response = await cashflowApi.getCashflow({ project_name: leadProject.title });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          setCashflowData(rows);
        } else {
          setCashflowData([]);
        }
      } catch (error) {
        console.error('Error fetching cashflow data:', error);
        setCashflowData([]);
      } finally {
        setIsLoadingCashflow(false);
      }
    };

    fetchCashflowData();
  }, [leadProject?.title]);

  // Get submitted documents (DPRs) for portfolio view - only for PMC Head and Team Lead
  const submittedDocuments = isPmcHeadOrTeamLead
    ? dprs.slice(0, 10) // Show top 10 recent submissions
    : [];

  // Get project documents (uploaded during project initiation)
  const vaultDocuments = isPmcHeadOrTeamLead ? projectDocuments : [];

  const plannedValueForSv = toNum(leadProject?.performance?.plannedValue);
  const svFromCost = toNum(costPerformanceData?.sv);
  const svPercentSafe = plannedValueForSv > 0 ? (svFromCost / plannedValueForSv) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'REJECTED': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  // Render Portfolio/Vault section for PMC Head and Team Lead
  const renderPortfolioVault = () => (
    <div className={`${themeClasses.glassCard} p-8 rounded-[3rem] border ${themeClasses.border}`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Document Vault</h3>
          <p className={`text-[10px] font-bold uppercase tracking-tight ${themeClasses.textSecondary}`}>Project Documents & Files</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-black uppercase ${themeClasses.textMuted}`}>
            {vaultDocuments.length} Documents
          </span>
          <div className={`p-2 rounded-xl ${themeClasses.bgSecondary}`}>
            <Icons.Document className={themeClasses.textPrimary} size={20} />
          </div>
        </div>
      </div>

      {vaultDocuments.length > 0 ? (
        <div className="space-y-3">
          {vaultDocuments.map((doc) => (
            <a
              key={doc.id}
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between p-4 border rounded-2xl transition-all group ${themeClasses.bgSecondary} ${themeClasses.border} ${themeClasses.bgHover}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${themeClasses.bgSecondary} ${themeClasses.textPrimary}`}>
                  <Icons.Document size={18} />
                </div>
                <div>
                  <p className={`text-sm font-black ${themeClasses.textPrimary}`}>{doc.project_name}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-tight ${themeClasses.textSecondary}`}>
                    {doc.file_name} • {doc.file_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                  Uploaded
                </span>
                <Icons.ChevronRight className={`${themeClasses.textMuted} group-hover:${themeClasses.textPrimary} group-hover:translate-x-1 transition-all`} size={16} />
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className={`p-4 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-4 ${themeClasses.bgSecondary}`}>
            <Icons.Document className={themeClasses.textMuted} size={24} />
          </div>
          <p className={`text-sm font-black ${themeClasses.textSecondary}`}>No Documents Uploaded</p>
          <p className={`text-[10px] mt-1 ${themeClasses.textMuted}`}>Upload documents when creating projects</p>
        </div>
      )}
    </div>
  );

  const renderTeamLeadCommandCenter = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Top Section: Gauges & Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Performance Gauges */}
        <div className={`lg:col-span-4 ${themeClasses.glassCard} p-6 rounded-[2.5rem] border ${themeClasses.border} flex flex-col`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Performance Indices</h3>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Icons.Performance size={18} />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex justify-around items-center gap-2 mb-8">
              <PerformanceGauge value={leadProject.performance?.spi || 0} label="SPI (Schedule)" color="#4f46e5" />
              <PerformanceGauge value={isLoadingCostPerformance ? 0 : (costPerformanceData?.cpi || leadProject.performance?.cpi || 0)} label="CPI (Cost)" color="#f43f5e" />
            </div>
            <div className={`p-5 border rounded-3xl ${themeClasses.bgSecondary} ${themeClasses.border}`}>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="space-y-1">
                  <p className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>Planned Value</p>
                  <p className={`text-sm font-black ${themeClasses.textPrimary}`}>{formatINR(leadProject.performance?.plannedValue || 0)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>Variance</p>
                  <p className={`text-sm font-black text-rose-500`}>{isLoadingCostPerformance ? '...' : `${svPercentSafe.toFixed(2)}%`}</p>
                </div>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400" style={{ width: '96%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Snapshots */}
        <div className={`lg:col-span-5 ${themeClasses.glassCard} p-6 rounded-[2.5rem] border ${themeClasses.border} flex flex-col`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Financial Summary</h3>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Icons.Finance size={18} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className={`p-5 border rounded-3xl transition-all cursor-default ${themeClasses.bgSecondary} ${themeClasses.border} ${themeClasses.bgHover} flex flex-col justify-between`}>
              <p className={`text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2`}>Revised Contract</p>
              <h4 className={`text-2xl font-black ${themeClasses.textPrimary}`}>
                {isLoadingContract ? '...' : formatINR(contractData?.revised_contract_value || leadProject.finances?.revisedValue || 0)}
              </h4>
            </div>
            <div className={`p-5 border rounded-3xl transition-all cursor-default ${themeClasses.bgSecondary} ${themeClasses.border} ${themeClasses.bgHover} flex flex-col justify-between`}>
              <p className={`text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-2`}>Earned Value</p>
              <h4 className={`text-2xl font-black ${themeClasses.textPrimary}`}>
                {isLoadingContractPerformance ? '...' : formatINR(contractPerformanceData?.earned_value || 0)}
              </h4>
            </div>
            <div className={`p-5 border rounded-3xl transition-all cursor-default ${themeClasses.bgSecondary} ${themeClasses.border} ${themeClasses.bgHover} flex flex-col justify-between`}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textMuted} mb-2`}>Actual Billed</p>
              <h4 className={`text-2xl font-black ${themeClasses.textPrimary}`}>
                {isLoadingContractPerformance ? '...' : formatINR(contractPerformanceData?.actual_billed || 0)}
              </h4>
            </div>
            <div className={`p-5 border rounded-3xl transition-all cursor-default ${themeClasses.bgSecondary} ${themeClasses.border} ${themeClasses.bgHover} flex flex-col justify-between`}>
              <p className={`text-[10px] font-black text-rose-300 uppercase tracking-widest mb-2`}>Variance</p>
              <h4 className={`text-2xl font-black ${themeClasses.textPrimary}`}>
                {isLoadingContractPerformance ? '...' : formatINR(contractPerformanceData?.variance || 0)}
              </h4>
            </div>
          </div>
        </div>

        {/* Document Vault for Team Lead */}
        <div className={`lg:col-span-3 ${themeClasses.glassCard} p-6 rounded-[2.5rem] border ${themeClasses.border} flex flex-col`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Document Vault</h3>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Icons.Document size={18} />
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {vaultDocuments.slice(0, 5).map((doc) => (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-4 border rounded-2xl transition-all block group ${themeClasses.bgSecondary} ${themeClasses.border} ${themeClasses.bgHover}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs font-black truncate group-hover:text-blue-400 transition-colors ${themeClasses.textPrimary}`}>{doc.project_name}</p>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${isDarkTheme ? 'bg-white/10 text-white border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {doc.file_type}
                  </span>
                </div>
                <p className={`text-[9px] font-bold uppercase truncate ${themeClasses.textMuted}`}>{doc.file_name}</p>
              </a>
            ))}
            {vaultDocuments.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-8">
                <Icons.Document size={32} className={`${themeClasses.textMuted} mb-2`} />
                <p className={`text-[10px] text-center uppercase font-black tracking-widest ${themeClasses.textMuted}`}>No Documents</p>
              </div>
            )}
          </div>
          <div className={`mt-6 pt-4 border-t ${themeClasses.border} flex items-center justify-between`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>Audit Ready</p>
            <p className={`text-[10px] font-black text-blue-400 uppercase tracking-widest`}>{vaultDocuments.length} Files</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* HSE Status */}
        <div className={`lg:col-span-3 ${themeClasses.glassCard} p-8 rounded-[3rem] border ${themeClasses.border} flex flex-col items-center justify-between`}>
          <div className="flex items-center justify-between w-full mb-8">
            <h3 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Health & Safety</h3>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Icons.Safety size={18} />
            </div>
          </div>
          <SafetyPyramid stats={leadProject.safety} />
          <div className={`mt-8 text-center w-full p-5 border rounded-3xl ${themeClasses.bgSecondary} ${themeClasses.border}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${themeClasses.textMuted}`}>Total Project Manhours</p>
            <p className={`text-2xl font-black ${themeClasses.textPrimary}`}>{leadProject.safety?.totalManhours.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Mid Section: Execution Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Progress S-Curve */}
        <div className={`lg:col-span-8 ${themeClasses.glassCard} p-8 rounded-[3rem] border ${themeClasses.border}`}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Project Progress S-Curve</h3>
              <p className={`text-[10px] font-bold uppercase tracking-tight ${themeClasses.textSecondary}`}>Cumulative Planned vs Actual Completion %</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                <span className={`text-[9px] font-black uppercase ${themeClasses.textMuted}`}>Planned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className={`text-[9px] font-black uppercase ${themeClasses.textMuted}`}>Actual</span>
              </div>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sCurveData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                <XAxis dataKey="name" hide />
                <YAxis unit="%" domain={[0, 100]} stroke={isDarkTheme ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                   contentStyle={{ 
                     background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                     border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, 
                     borderRadius: '1rem' 
                   }}
                />
                <Area type="monotone" dataKey="planned" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.05} strokeWidth={3} />
                <Area type="monotone" dataKey="actual" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Phase Progress Bars */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`${themeClasses.glassCard} p-6 rounded-[2.5rem] border ${themeClasses.border}`}>
            <h3 className={`text-[10px] font-black uppercase tracking-widest mb-6 ${themeClasses.textSecondary}`}>Phase Completion</h3>
            <div className="space-y-6">
              {[
                { label: 'Engineering', value: leadProject.progress?.engineering || 0, color: 'bg-indigo-600' },
                { label: 'Procurement', value: leadProject.progress?.procurement || 0, color: 'bg-blue-500' },
                { label: 'Construction', value: leadProject.progress?.construction || 0, color: 'bg-emerald-500' },
              ].map((phase, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className={`text-xs font-black uppercase ${themeClasses.textPrimary}`}>{phase.label}</span>
                    <span className={`text-xs font-black ${themeClasses.textPrimary}`}>{phase.value}%</span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden ${themeClasses.bgSecondary}`}>
                    <div className={`${phase.color} h-full transition-all duration-1000`} style={{ width: `${phase.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${isDarkTheme ? 'bg-indigo-950' : 'bg-indigo-900'} text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group`}>
            <div className="relative z-10">
              <h4 className="text-xs font-black uppercase text-indigo-400 tracking-widest mb-4">Site Resource Intensity</h4>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-3xl font-black text-white">{leadProject.safety?.totalManhours.toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-indigo-300 uppercase">Logged Manhours</p>
                </div>
                <div className="w-px h-10 bg-indigo-800"></div>
                <div>
                  <p className="text-3xl font-black text-rose-400">{leadProject.safety?.major}</p>
                  <p className="text-[9px] font-bold text-indigo-300 uppercase">Critical Issues</p>
                </div>
              </div>
              <button className="w-full mt-6 py-3 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all text-white">Download Master Report</button>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
          </div>
        </div>
      </div>

      {/* Cashflow Section: Cash In vs Cash Out */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`${themeClasses.glassCard} p-8 rounded-[3rem] border ${themeClasses.border}`}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Cash In vs Cash Out</h3>
              <p className={`text-[10px] font-bold uppercase tracking-tight ${themeClasses.textSecondary}`}>Monthly cash flow analysis</p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Icons.Finance size={18} />
            </div>
          </div>
          <div className="h-[300px]">
            {isLoadingCashflow ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : cashflowData && cashflowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowData.map(item => ({
                  name: item.month_year,
                  'Cash In': item.cash_in_actual || 0,
                  'Cash Out': item.cash_out_actual || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                  <XAxis dataKey="name" stroke={isDarkTheme ? "#94a3b8" : "#64748b"} fontSize={10} tickLine={false} />
                  <YAxis stroke={isDarkTheme ? "#94a3b8" : "#64748b"} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ 
                      background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                      border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, 
                      borderRadius: '1rem', 
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' 
                    }}
                    itemStyle={{ color: isDarkTheme ? '#fff' : '#000', fontSize: '11px', fontWeight: '600' }}
                    labelStyle={{ color: isDarkTheme ? '#94a3b8' : '#64748b', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}
                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, '']}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span style={{ color: isDarkTheme ? '#94a3b8' : '#64748b', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>{value}</span>}
                  />
                  <Bar dataKey="Cash In" fill="#10b981" radius={[6, 6, 0, 0]} barSize={30} />
                  <Bar dataKey="Cash Out" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <Icons.Finance size={48} className={`${themeClasses.textMuted} mb-4 opacity-20`} />
                <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>No cashflow data available</p>
                <p className={`text-[9px] mt-1 ${themeClasses.textMuted}`}>Cash flow data will appear here once available</p>
              </div>
            )}
          </div>
          {cashflowData && cashflowData.length > 0 && (
            <div className={`mt-6 pt-6 border-t ${themeClasses.border} grid grid-cols-2 md:grid-cols-4 gap-4`}>
              <div className="text-center">
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${themeClasses.textMuted}`}>Total Cash In</p>
                <p className="text-lg font-black text-emerald-500">
                  ₹{cashflowData.reduce((sum, item) => sum + (item.cash_in_actual || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${themeClasses.textMuted}`}>Total Cash Out</p>
                <p className="text-lg font-black text-rose-500">
                  ₹{cashflowData.reduce((sum, item) => sum + (item.cash_out_actual || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${themeClasses.textMuted}`}>Net Cash Flow</p>
                <p className={`text-lg font-black ${cashflowData.reduce((sum, item) => sum + (item.cash_in_actual || 0) - (item.cash_out_actual || 0), 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ₹{cashflowData.reduce((sum, item) => sum + (item.cash_in_actual || 0) - (item.cash_out_actual || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${themeClasses.textMuted}`}>Months Tracked</p>
                <p className={`text-lg font-black ${themeClasses.textPrimary}`}>{cashflowData.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Logs & Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
        <div className={`lg:col-span-7 ${themeClasses.glassCard} p-8 rounded-[3rem] border ${themeClasses.border} overflow-hidden flex flex-col`}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Critical Action Items</h3>
              <p className={`text-[10px] font-bold uppercase tracking-tight ${themeClasses.textSecondary}`}>Active bottlenecks requiring immediate attention</p>
            </div>
            <button className={`text-[10px] font-black uppercase border px-4 py-2 rounded-xl transition-all ${themeClasses.buttonSecondary} ${themeClasses.border}`}>View Full Ledger</button>
          </div>
          <div className="space-y-4 flex-1">
            {[
              { title: 'Utility Shifting Delay', risk: 'High', status: 'Blocked', icon: Icons.Issue, color: 'text-rose-500', bg: 'bg-rose-500/10' },
              { title: 'RLDA Design Approval', risk: 'Medium', status: 'Review', icon: Icons.Document, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { title: 'Material Supply - Steel', risk: 'Low', status: 'Tracked', icon: Icons.Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            ].map((issue, i) => (
              <div key={i} className={`flex items-center justify-between p-5 border rounded-[2rem] group transition-all cursor-default ${themeClasses.bgSecondary} ${themeClasses.border} ${themeClasses.bgHover}`}>
                <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl ${issue.bg} ${issue.color} shadow-inner`}>
                    <issue.icon size={20} />
                  </div>
                  <div>
                    <p className={`text-base font-black ${themeClasses.textPrimary}`}>{issue.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Risk: {issue.risk}</span>
                      <div className={`w-1 h-1 rounded-full ${isDarkTheme ? 'bg-white/20' : 'bg-slate-200'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Site ID: #KL-092</span>
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border ${issue.status === 'Blocked' ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' :
                  issue.status === 'Review' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' :
                    'bg-blue-500/20 text-blue-500 border-blue-500/30'
                  }`}>
                  {issue.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={`lg:col-span-5 ${themeClasses.glassCard} p-8 rounded-[3rem] border ${themeClasses.border} flex flex-col`}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Execution Histogram</h3>
              <p className={`text-[10px] font-bold uppercase tracking-tight ${themeClasses.textSecondary}`}>Manpower & Resource distribution trends</p>
            </div>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Icons.History size={18} />
            </div>
          </div>
          <div className="h-[250px] flex-1">
            {isLoadingManpower ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : manpowerData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={manpowerData.month_year ? [{ name: manpowerData.month_year, planned: manpowerData.planned_manpower || 0, actual: manpowerData.actual_manpower || 0 }] : []}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ 
                      background: isDarkTheme ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
                      border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, 
                      borderRadius: '1rem' 
                    }}
                    itemStyle={{ color: isDarkTheme ? '#fff' : '#000', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                  />
                  <Bar dataKey="actual" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>No manpower data available</p>
              </div>
            )}
          </div>
          <div className={`mt-8 pt-8 border-t ${themeClasses.border} flex justify-between items-center gap-4`}>
            <div className="text-center flex-1">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textMuted}`}>Planned</p>
              <p className={`text-xl font-black ${themeClasses.textPrimary}`}>{manpowerData?.planned_manpower || 0}</p>
            </div>
            <div className={`w-px h-10 ${themeClasses.border}`}></div>
            <div className="text-center flex-1">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textMuted}`}>Actual</p>
              <p className={`text-xl font-black ${themeClasses.textPrimary}`}>{manpowerData?.actual_manpower || 0}</p>
            </div>
            <div className={`w-px h-10 ${themeClasses.border}`}></div>
            <div className="text-center flex-1">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textMuted}`}>Efficiency</p>
              <p className={`text-xl font-black ${themeClasses.textPrimary}`}>{manpowerData?.manpower_efficiency ? `${(manpowerData.manpower_efficiency * 100).toFixed(0)}%` : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const getKpis = () => {
    const submittedCount = projects.filter(p => p.status === ProjectStatus.SUBMITTED || p.status === ProjectStatus.REVIEWED).length;
    const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
    const utilization = projects.length > 0 ? 68 + (projects.length % 10) : 0;
    const myDprsCount = dprs.filter(d => d.submittedBy === user.id).length;

    switch (user.role) {
      case UserRole.PMC_HEAD:
        return [
          { id: 'portfolio', label: 'Portfolio Value', value: formatINR(totalBudget + 180000000), icon: Icons.Project, color: 'text-blue-600', bg: 'bg-blue-50' },
          { id: 'dprs', label: 'Active DPRs', value: '48', subtext: '+12 today', icon: Icons.Task, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { id: 'attention', label: 'Needs Attention', value: submittedCount.toString(), icon: Icons.Pending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { id: 'utilization', label: 'Budget Utilization', value: `${utilization}%`, icon: Icons.History, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ];
      case UserRole.TEAM_LEAD:
        return [
          { id: 'portfolio', label: 'Team Value', value: formatINR(totalBudget), icon: Icons.Project, color: 'text-blue-600', bg: 'bg-blue-50' },
          { id: 'dprs', label: 'Team Logs', value: dprs.length.toString(), icon: Icons.Task, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { id: 'attention', label: 'Review Queue', value: submittedCount.toString(), icon: Icons.Pending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { id: 'utilization', label: 'Efficiency', value: '92%', icon: Icons.History, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ];
      case UserRole.SITE_ENGINEER:
        return [
          { id: 'tasks', label: 'My Tasks', value: projects.filter(p => p.siteEngineerIds.includes(user.id)).length.toString(), icon: Icons.Task, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { id: 'dprs', label: 'Submitted Logs', value: myDprsCount.toString(), icon: Icons.History, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { id: 'docs', label: 'Vault Health', value: '100%', icon: Icons.Approve, color: 'text-blue-600', bg: 'bg-blue-50' },
          { id: 'attention', label: 'Unresolved Issues', value: '1', icon: Icons.Issue, color: 'text-amber-600', bg: 'bg-amber-50' },
        ];
      case UserRole.COORDINATOR:
        return [
          { id: 'dprs', label: 'Active DPRs', value: '32', subtext: '+8 today', icon: Icons.Task, color: 'text-blue-600', bg: 'bg-blue-50' },
          { id: 'docs', label: 'Processed Docs', value: '124', icon: Icons.Document, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { id: 'attention', label: 'Verification Queue', value: '8', icon: Icons.Pending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { id: 'execution', label: 'Site Execution', value: '4', icon: Icons.Execution, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ];
      default:
        return [];
    }
  };

  const kpis = getKpis();

  // Unified Dashboard Shell
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className={`relative rounded-[2rem] overflow-hidden p-6 ${isDarkTheme ? '' : 'bg-slate-100 shadow-sm border border-slate-200'}`}>
        <div className={isDarkTheme ? "hero-bg" : "bg-gradient-to-br from-indigo-600/90 to-blue-700/90 absolute inset-0"}></div>
        <div className="relative">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">PMC COMMAND CENTER // {user.role.replace('_', ' ')}</h2>
              <p className="text-white/70 font-bold text-sm tracking-tight uppercase tracking-widest text-[10px]">Strategic Asset Management & Workflow</p>
              {isPMCHead && projects.length > 0 && (
                <div className="mt-3">
                  <select
                    value={selectedProjectId || ''}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id} className="bg-slate-800 text-white">
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="text-right flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none">Real-time Feed</p>
                <p className="text-xs font-black status-badge-white uppercase">Live Stream Connected</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/60">
                <Icons.History size={20} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, idx) => (
              <button
                key={idx}
                onClick={() => onStatClick(kpi.id as StatType)}
                className={`group text-left kpi-card p-6 rounded-[2rem] transition-all hover:-translate-y-1 focus:outline-none opacity-0 animate-slide-up stagger-${Math.min(idx + 1, 3)} ${kpi.id === 'dprs' ? 'kpi-accent-orange' : (isDarkTheme ? 'glass-card' : 'bg-white shadow-lg border border-slate-100')}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${kpi.id === 'dprs' ? 'bg-white/20 text-white' : (isDarkTheme ? 'bg-white/10 text-contrast' : 'bg-indigo-50 text-indigo-600')} group-hover:scale-110 transition-transform`}>
                    <kpi.icon size={24} />
                  </div>
                  <Icons.ChevronRight className={`${kpi.id === 'dprs' ? 'text-white/40 group-hover:text-white' : (isDarkTheme ? 'text-white/40 group-hover:text-white' : 'text-slate-400 group-hover:text-indigo-600')} group-hover:translate-x-1 transition-all`} size={16} />
                </div>
                <div className="space-y-1">
                  <p className={`text-[9px] font-black uppercase tracking-widest ${kpi.id === 'dprs' ? 'text-white/90' : themeClasses.textSecondary}`}>{kpi.label}</p>
                  <h3 className={`text-3xl font-black leading-none ${kpi.id === 'dprs' ? 'text-white' : themeClasses.textPrimary}`}>{kpi.value}</h3>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {user.role === UserRole.TEAM_LEAD ? (
        renderTeamLeadCommandCenter()
      ) : (
        <>
          {/* Portfolio Vault Section - Only for PMC Head and Team Lead */}
          {isPmcHeadOrTeamLead && (
            <div className="mt-8">
              {renderPortfolioVault()}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
            {/* Standard content for other roles... */}
            <div className="lg:col-span-2 space-y-8">
              <div className={`${themeClasses.glassCard} p-8 rounded-[3rem] border ${themeClasses.border} shadow-sm`}>
                <h3 className={`text-sm font-black uppercase mb-8 tracking-widest ${themeClasses.textPrimary}`}>Active Operations Monitor</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={velocityData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          background: isDarkTheme ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
                          border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, 
                          borderRadius: '1rem' 
                        }} 
                      />
                      <Area type="monotone" dataKey="ongoing" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.05} strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className={`${isDarkTheme ? 'bg-indigo-950' : 'bg-indigo-900'} text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden`}>
                <div className="relative z-10">
                  <Icons.History className="text-indigo-400 mb-6" size={32} />
                  <h4 className="text-xl font-black mb-2 uppercase tracking-tighter text-white">Immutable Audit</h4>
                  <p className="text-xs text-indigo-300 font-bold leading-relaxed mb-8 uppercase tracking-widest">Tracking project state transitions with cryptographic identity verification.</p>
                  <button className="w-full py-4 bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all text-white">View Full Ledger</button>
                </div>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
              </div>
            </div>
          </div>
        </>
      )}

      {isDPRModalOpen && (
        <DPRSubmissionForm
          assignedProjects={user.role === UserRole.SITE_ENGINEER ? projects : projects.filter(p => p.siteEngineerIds.includes(user.id))}
          onClose={() => setIsDPRModalOpen(false)}
          onSubmit={(data) => {
            onSubmitDPR(data);
            setIsDPRModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

// ... Velocity data and constants remain the same
const velocityData = [
  { name: 'Jan', completed: 4, ongoing: 10, budget: 2000 },
  { name: 'Feb', completed: 3, ongoing: 12, budget: 3500 },
  { name: 'Mar', completed: 6, ongoing: 14, budget: 2800 },
  { name: 'Apr', completed: 8, ongoing: 11, budget: 4100 },
  { name: 'May', completed: 10, ongoing: 13, budget: 5000 },
];

export default Dashboard;
