import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    Shield, TrendingUp, Users, HardHat,
    AlertTriangle, RefreshCw, Search
} from 'lucide-react';
import { healthSafetyApi, projectProgressApi, manpowerApi, equipmentApi, cashflowApi } from '../services/api';
import ProjectEquipmentChart from './ProjectEquipmentChart';
import { User, UserRole } from '../types';

// Types for dashboard data
interface HealthSafetyStatus {
    fatalities: number;
    significant: number;
    major: number;
    minor: number;
    near_miss: number;
    total_manhours: number;
    loss_of_manhours: number;
    status: string;
}

interface ProjectProgress {
    id: string;
    project: string;
    month: string;
    monthly_plan: number;
    monthly_actual: number;
    cumulative_plan: number;
    cumulative_actual: number;
    overall_progress: number;
    status: string;
}

interface ManpowerData {
    id: string;
    project: string;
    date: string;
    skilled: number;
    unskilled: number;
    operators: number;
    supervisors: number;
    total: number;
}

interface ManpowerDashboardData {
    months: string[];
    planned_manpower: number[];
    actual_manpower: number[];
    planned_mh_cumulative: number[];
    actual_mh_cumulative: number[];
    manpower_efficiency: (number | null)[];
    actual_below_planned: boolean[];
}

interface EquipmentData {
    id: string;
    project: string;
    name: string;
    category: string;
    quantity: number;
    operational: number;
    under_maintenance: number;
    idle: number;
}

interface EquipmentChartData {
    month: string;
    plannedMonthly: number;
    actualMonthly: number;
    plannedCumulative: number;
    actualCumulative: number;
}

interface CashFlowData {
    id?: number;
    project_name: string;
    month_year: string;
    cash_in_monthly_plan: number;
    cash_in_monthly_actual: number;
    cash_out_monthly_plan: number;
    cash_out_monthly_actual: number;
    actual_cost_monthly: number;
    cash_in_cumulative_plan?: number;
    cash_in_cumulative_actual?: number;
    cash_out_cumulative_plan?: number;
    cash_out_cumulative_actual?: number;
    actual_cost_cumulative?: number;
}

// Color constants
const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
    purple: '#8B5CF6',
};

const CHART_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.info, COLORS.purple];

interface SiteEngineerDashboardProps {
    user?: User | null;
}

const SiteEngineerDashboard: React.FC<SiteEngineerDashboardProps> = ({ user }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>('');
    const [hasSearched, setHasSearched] = useState(false);

    // Dashboard data states
    const [healthSafety, setHealthSafety] = useState<HealthSafetyStatus | null>(null);
    const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([]);
    const [manpower, setManpower] = useState<ManpowerData[]>([]);
    const [manpowerDashboard, setManpowerDashboard] = useState<ManpowerDashboardData | null>(null);
    const [equipment, setEquipment] = useState<EquipmentData[]>([]);
    const [equipmentChartData, setEquipmentChartData] = useState<EquipmentChartData[]>([]);

    // Cashflow state for Billing Site Engineer
    const [cashflowData, setCashflowData] = useState<CashFlowData[]>([]);
    const [cashflowForm, setCashflowForm] = useState<CashFlowData>({
        project_name: '',
        month_year: '',
        cash_in_monthly_plan: 0,
        cash_in_monthly_actual: 0,
        cash_out_monthly_plan: 0,
        cash_out_monthly_actual: 0,
        actual_cost_monthly: 0,
    });
    const [isCashflowModalOpen, setIsCashflowModalOpen] = useState(false);
    const [cashflowLoading, setCashflowLoading] = useState(false);

    // Check if user is Billing Site Engineer
    const isBillingSiteEngineer = user?.role === UserRole.BILLING_SITE_ENGINEER;

    const fetchDashboardData = async () => {
        if (!projectName.trim()) {
            setError('Please enter a project or site name');
            return;
        }

        setLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            // Use POST to filter by project name
            const projectFilter = { project: projectName };

            // Fetch all data in parallel
            const [hsRes, ppRes, mpRes, mpDashRes, eqRes] = await Promise.all([
                healthSafetyApi.getReports({ project_name: projectName }),
                projectProgressApi.getProjectProgress({ project_name: projectName }),
                manpowerApi.getManpower({ project_name: projectName }),
                manpowerApi.getManpowerDashboard(projectName),
                equipmentApi.getEquipment({ project_name: projectName }),
            ]);

            // Process Health & Safety data (get first/most recent report)
            const hsData = hsRes.data.results || hsRes.data;
            if (Array.isArray(hsData) && hsData.length > 0) {
                const latestReport = hsData[0];
                setHealthSafety({
                    fatalities: latestReport.fatalities || 0,
                    significant: latestReport.significant || 0,
                    major: latestReport.major || 0,
                    minor: latestReport.minor || 0,
                    near_miss: latestReport.near_miss || 0,
                    total_manhours: latestReport.total_manhours || 0,
                    loss_of_manhours: 0,
                    status: 'active'
                });
            } else if (hsData && !Array.isArray(hsData)) {
                // Single object case
                setHealthSafety({
                    fatalities: hsData.fatalities || 0,
                    significant: hsData.significant || 0,
                    major: hsData.major || 0,
                    minor: hsData.minor || 0,
                    near_miss: hsData.near_miss || 0,
                    total_manhours: hsData.total_manhours || 0,
                    loss_of_manhours: 0,
                    status: 'active'
                });
            }

            // Process Project Progress data - map API fields to dashboard fields
            const ppData = ppRes.data.results || ppRes.data;
            const mappedProgress = Array.isArray(ppData) ? ppData.map((pp: any) => ({
                id: pp.id || '1',
                project: pp.project_name || projectName,
                month: pp.progress_month ? new Date(pp.progress_month).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : 'N/A',
                monthly_plan: pp.monthly_plan || 0,
                monthly_actual: pp.monthly_actual || 0,
                cumulative_plan: pp.cumulative_plan || 0,
                cumulative_actual: pp.cumulative_actual || 0,
                overall_progress: pp.cumulative_actual || 0,
                status: (pp.cumulative_actual || 0) < (pp.cumulative_plan || 0) ? 'Delayed' : 'On Track'
            })) : [];
            setProjectProgress(mappedProgress);

            // Process Manpower data - map API fields to dashboard fields (get last 7 entries for histogram)
            const mpData = mpRes.data.results || mpRes.data;
            const mappedManpower = Array.isArray(mpData) ? mpData.map((mp: any) => ({
                id: mp.id,
                project: mp.project_name,
                date: mp.month_year ? '1-' + mp.month_year : new Date().toISOString().split('T')[0],
                skilled: Math.floor((mp.actual_manpower || 0) * 0.4),
                unskilled: Math.floor((mp.actual_manpower || 0) * 0.3),
                operators: Math.floor((mp.actual_manpower || 0) * 0.2),
                supervisors: Math.floor((mp.actual_manpower || 0) * 0.1),
                total: mp.actual_manpower || 0
            })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];
            setManpower(mappedManpower.slice(0, 7));

            // Process Manpower Dashboard data for histogram
            const mpDashData = mpDashRes.data;
            if (mpDashData && mpDashData.months && mpDashData.months.length > 0) {
                setManpowerDashboard({
                    months: mpDashData.months,
                    planned_manpower: mpDashData.planned_manpower || [],
                    actual_manpower: mpDashData.actual_manpower || [],
                    planned_mh_cumulative: mpDashData.planned_mh_cumulative || [],
                    actual_mh_cumulative: mpDashData.actual_mh_cumulative || [],
                    manpower_efficiency: mpDashData.manpower_efficiency || [],
                    actual_below_planned: mpDashData.actual_below_planned || []
                });
            } else {
                setManpowerDashboard(null);
            }

            // Process Equipment data - map API fields to dashboard fields
            const eqData = eqRes.data.results || eqRes.data;
            const mappedEquipment = Array.isArray(eqData) ? eqData.map((eq: any) => ({
                id: eq.id,
                project: eq.project_name,
                name: eq.project_name,
                category: eq.month_display || 'Equipment',
                quantity: eq.actual_equipment || 0,
                operational: eq.actual_equipment || 0,
                under_maintenance: (eq.planned_equipment || 0) - (eq.actual_equipment || 0),
                idle: 0
            })) : [];
            setEquipment(mappedEquipment);

            // Process Equipment data for chart - DPR style with monthly and cumulative
            const mappedEquipmentChart: EquipmentChartData[] = Array.isArray(eqData) ? eqData.map((eq: any) => ({
                month: eq.month_display || 'N/A',
                plannedMonthly: eq.planned_equipment || 0,
                actualMonthly: eq.actual_equipment || 0,
                plannedCumulative: eq.planned_cumulative || 0,
                actualCumulative: eq.actual_cumulative || 0
            })).sort((a: any, b: any) => {
                const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const aMonth = a.month.substring(0, 3);
                const bMonth = b.month.substring(0, 3);
                return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
            }) : [];
            setEquipmentChartData(mappedEquipmentChart);

        } catch (err: any) {
            console.error('Error fetching dashboard data:', err);
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    // Handle form submission
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchDashboardData();
    };

    // Fetch cashflow data for Billing Site Engineer
    const fetchCashflowData = async () => {
        if (!projectName.trim()) return;
        try {
            setCashflowLoading(true);
            const response = await cashflowApi.getCashflow({ project_name: projectName });
            setCashflowData(response.data || []);
        } catch (err) {
            console.error('Error fetching cashflow data:', err);
        } finally {
            setCashflowLoading(false);
        }
    };

    // Submit cashflow data
    const handleCashflowSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setCashflowLoading(true);
            await cashflowApi.createCashflow(cashflowForm);
            setCashflowForm({
                project_name: '',
                month_year: '',
                cash_in_monthly_plan: 0,
                cash_in_monthly_actual: 0,
                cash_out_monthly_plan: 0,
                cash_out_monthly_actual: 0,
                actual_cost_monthly: 0,
            });
            fetchCashflowData();
        } catch (err) {
            console.error('Error submitting cashflow data:', err);
        } finally {
            setCashflowLoading(false);
        }
    };

    // Handle cashflow form input changes
    const handleCashflowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCashflowForm(prev => ({
            ...prev,
            [name]: name.includes('monthly') || name.includes('actual') || name.includes('cost') ? parseFloat(value) || 0 : value
        }));
    };

    // Load cashflow data when project name is set and user is Billing Site Engineer
    useEffect(() => {
        if (isBillingSiteEngineer && projectName) {
            fetchCashflowData();
        }
    }, [isBillingSiteEngineer, projectName]);

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active':
            case 'on_track':
                return 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/25';
            case 'delayed':
            case 'on_hold':
                return 'text-rose-300 bg-rose-500/15 border border-rose-500/25';
            case 'completed':
                return 'text-indigo-300 bg-indigo-500/15 border border-indigo-500/25';
            default:
                return 'text-slate-300 bg-white/5 border border-white/10';
        }
    };

    // Get equipment status color
    const getEquipmentStatusColor = (eq: EquipmentData) => {
        if (eq.under_maintenance > 0) return 'bg-red-500';
        if (eq.idle > 0) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    // Calculate safety score
    const calculateSafetyScore = () => {
        if (!healthSafety) return 0;
        const totalIncidents = healthSafety.fatalities + healthSafety.significant +
            healthSafety.major + healthSafety.minor + healthSafety.near_miss;
        if (totalIncidents === 0) return 100;
        return Math.max(0, 100 - (totalIncidents * 5));
    };

    // Prepare manpower histogram data from dashboard endpoint
    const getManpowerHistogramData = () => {
        if (!manpowerDashboard || !manpowerDashboard.months || manpowerDashboard.months.length === 0) {
            // Fallback to list data if dashboard data is not available
            return manpower.map((m: ManpowerData) => ({
                date: new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                Skilled: m.skilled,
                Unskilled: m.unskilled,
                Operators: m.operators,
                Supervisors: m.supervisors,
                Total: m.total
            }));
        }

        // Use dashboard data for histogram
        return manpowerDashboard.months.map((month: string, index: number) => ({
            date: month,
            Planned: manpowerDashboard.planned_manpower[index] || 0,
            Actual: manpowerDashboard.actual_manpower[index] || 0
        }));
    };

    // Prepare equipment pie chart data
    const getEquipmentStatusData = () => {
        const statusCounts: Record<string, number> = {};
        equipment.forEach((eq: EquipmentData) => {
            if (eq.under_maintenance > 0) {
                statusCounts['Under Maintenance'] = (statusCounts['Under Maintenance'] || 0) + eq.quantity;
            } else if (eq.idle > 0) {
                statusCounts['Idle'] = (statusCounts['Idle'] || 0) + eq.quantity;
            } else {
                statusCounts['Operational'] = (statusCounts['Operational'] || 0) + eq.quantity;
            }
        });

        return Object.entries(statusCounts).map(([name, value]) => ({
            name,
            value
        }));
    };

    // Prepare progress chart data - months on X axis, cumulative percentage on Y axis
    const getProgressData = () => {
        if (projectProgress.length === 0) {
            return [{ month: 'No Data', 'Cumulative Plan': 0, 'Cumulative Actual': 0 }];
        }
        return projectProgress.map((p: ProjectProgress) => ({
            month: p.month || 'N/A',
            'Cumulative Plan': p.cumulative_plan || 0,
            'Cumulative Actual': p.cumulative_actual || 0
        }));
    };

    // Get latest manpower total
    const getLatestManpowerTotal = () => {
        // Use dashboard data if available
        if (manpowerDashboard && manpowerDashboard.actual_manpower && manpowerDashboard.actual_manpower.length > 0) {
            return manpowerDashboard.actual_manpower[manpowerDashboard.actual_manpower.length - 1] || 0;
        }
        // Fallback to list data
        if (manpower.length === 0) return 0;
        return manpower[manpower.length - 1]?.total || 0;
    };

    // Get latest progress
    const getLatestProgress = () => {
        if (projectProgress.length === 0) return 0;
        return projectProgress[0]?.overall_progress || 0;
    };

    // Show initial state
    if (!hasSearched) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-contrast uppercase tracking-tight">Site Engineer Dashboard</h1>
                    <p className="muted text-[10px] font-black uppercase tracking-widest mt-1">
                        Enter project or site name to view real-time monitoring data
                    </p>
                </div>

                {/* Search Form */}
                <div className="max-w-xl mx-auto">
                    <form onSubmit={handleSearch} className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5">
                        <label className="block text-[10px] font-black uppercase tracking-widest muted mb-2">
                            Enter Project / Site Name
                        </label>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder="e.g., Site A, Project Alpha, Building 1"
                                    className="w-full px-4 py-3 glass-input rounded-xl text-sm font-semibold text-contrast placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-black uppercase tracking-widest"
                            >
                                <Search className="h-4 w-4" />
                                Search
                            </button>
                        </div>
                        <p className="text-[10px] muted font-bold uppercase tracking-widest mt-3">
                            Enter the exact project or site name to fetch dashboard data
                        </p>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/60 text-sm font-bold">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-contrast uppercase tracking-tight">Site Engineer Dashboard</h1>
                    <p className="muted text-[10px] font-black uppercase tracking-widest mt-1">
                        Enter project or site name to view real-time monitoring data
                    </p>
                </div>

                {/* Search Form */}
                <div className="max-w-xl mx-auto">
                    <form onSubmit={handleSearch} className="glass-card rounded-2xl border border-white/10 p-6 bg-white/5">
                        <label className="block text-[10px] font-black uppercase tracking-widest muted mb-2">
                            Enter Project / Site Name
                        </label>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder="e.g., Site A, Project Alpha, Building 1"
                                    className="w-full px-4 py-3 glass-input rounded-xl text-sm font-semibold text-contrast placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors flex items-center gap-2 text-sm font-black uppercase tracking-widest"
                            >
                                <Search className="h-4 w-4" />
                                Search
                            </button>
                        </div>
                    </form>
                </div>

                {/* Error Message */}
                <div className="max-w-xl mx-auto">
                    <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-rose-400" />
                            <span className="text-rose-200 font-bold text-sm">{error}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-contrast uppercase tracking-tight">Site Engineer Dashboard</h1>
                    <p className="muted text-[10px] font-black uppercase tracking-widest mt-1">
                        Showing data for: <span className="text-indigo-300">{projectName}</span>
                    </p>
                </div>

                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Change project..."
                            className="px-4 py-2 glass-input rounded-xl text-sm font-semibold text-contrast placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                        >
                            <Search className="h-4 w-4" />
                            Search
                        </button>
                    </form>

                    <button
                        onClick={fetchDashboardData}
                        className="flex items-center px-4 py-2 bg-white/10 text-contrast rounded-xl hover:bg-white/15 transition-colors border border-white/10 text-xs font-black uppercase tracking-widest"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Safety Score Card */}
                <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest muted">Safety Score</p>
                            <h3 className="text-3xl font-black text-contrast mt-1">
                                {calculateSafetyScore()}%
                            </h3>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <Shield className="h-6 w-6 text-emerald-300" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="w-full bg-white/10 rounded-full h-2">
                            <div
                                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${calculateSafetyScore()}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-white/60 font-bold mt-2">
                            Based on {healthSafety?.total_manhours || 0} man-hours
                        </p>
                    </div>
                </div>

                {/* Overall Progress Card */}
                <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest muted">Overall Progress</p>
                            <h3 className="text-3xl font-black text-contrast mt-1">
                                {getLatestProgress()}%
                            </h3>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <TrendingUp className="h-6 w-6 text-indigo-300" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Status</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(projectProgress[0]?.status)}`}>
                            {projectProgress[0]?.status || 'N/A'}
                        </span>
                    </div>
                </div>

                {/* Total Manpower Card */}
                <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest muted">Total Manpower</p>
                            <h3 className="text-3xl font-black text-contrast mt-1">
                                {getLatestManpowerTotal()}
                            </h3>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <Users className="h-6 w-6 text-amber-300" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex -space-x-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">S</div>
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs text-white">U</div>
                            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white">O</div>
                            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs text-white">P</div>
                        </div>
                    </div>
                </div>

                {/* Equipment Card */}
                <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest muted">Total Equipment</p>
                            <h3 className="text-3xl font-black text-contrast mt-1">
                                {equipment.reduce((sum, eq) => sum + eq.quantity, 0)}
                            </h3>
                        </div>
                        <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                            <HardHat className="h-6 w-6 text-cyan-300" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-white/70 font-bold">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {equipment.filter(eq => eq.operational > 0).length} Operational
                        <span className="w-2 h-2 bg-yellow-500 rounded-full ml-2"></span>
                        {equipment.filter(eq => eq.idle > 0).length} Idle
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Project Progress Status */}
                <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-contrast">Project Progress Status</h3>
                        <TrendingUp className="h-5 w-5 text-indigo-300" />
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getProgressData()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
                                <XAxis dataKey="month" stroke="rgba(255,255,255,0.60)" fontSize={12} />
                                <YAxis stroke="rgba(255,255,255,0.60)" fontSize={12} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px' }}
                                    formatter={(value: number) => [`${value}%`, '']}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="Cumulative Plan" stroke={COLORS.primary} strokeWidth={2} dot={{ fill: COLORS.primary }} name="Cumulative Plan %" />
                                <Line type="monotone" dataKey="Cumulative Actual" stroke={COLORS.success} strokeWidth={2} dot={{ fill: COLORS.success }} name="Cumulative Actual %" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Manpower Histogram */}
                <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-contrast">Project Manpower Histogram</h3>
                        <span className="text-[10px] muted font-black uppercase tracking-widest">{manpowerDashboard ? 'Monthly' : 'Last 7 days'}</span>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getManpowerHistogramData()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.60)" fontSize={12} />
                                <YAxis stroke="rgba(255,255,255,0.60)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px' }}
                                />
                                <Legend />
                                {manpowerDashboard ? (
                                    <>
                                        <Bar dataKey="Planned" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Actual" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                                    </>
                                ) : (
                                    <>
                                        <Bar dataKey="Skilled" stackId="a" fill={COLORS.primary} />
                                        <Bar dataKey="Unskilled" stackId="a" fill={COLORS.success} />
                                        <Bar dataKey="Operators" stackId="a" fill={COLORS.warning} />
                                        <Bar dataKey="Supervisors" stackId="a" fill={COLORS.purple} />
                                    </>
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Health & Safety Status */}
                <div className="glass-card rounded-2xl border border-white/10 p-5 bg-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-contrast">Health & Safety Status</h3>
                        <Shield className="h-5 w-5 text-emerald-300" />
                    </div>

                    {healthSafety ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-300">Fatalities</span>
                                    <AlertTriangle className="h-4 w-4 text-rose-300" />
                                </div>
                                <p className="text-2xl font-black text-rose-200 mt-1">{healthSafety.fatalities}</p>
                            </div>

                            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">Significant</span>
                                    <AlertTriangle className="h-4 w-4 text-amber-300" />
                                </div>
                                <p className="text-2xl font-black text-amber-200 mt-1">{healthSafety.significant}</p>
                            </div>

                            <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Major</span>
                                    <AlertTriangle className="h-4 w-4 text-yellow-300" />
                                </div>
                                <p className="text-2xl font-black text-yellow-200 mt-1">{healthSafety.major}</p>
                            </div>

                            <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Minor</span>
                                </div>
                                <p className="text-2xl font-black text-indigo-200 mt-1">{healthSafety.minor}</p>
                            </div>

                            <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">Near Miss</span>
                                </div>
                                <p className="text-2xl font-black text-purple-200 mt-1">{healthSafety.near_miss}</p>
                            </div>

                            <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Man-hours</span>
                                </div>
                                <p className="text-2xl font-black text-emerald-200 mt-1">
                                    {healthSafety.total_manhours ? (healthSafety.total_manhours / 1000).toFixed(1) + 'K' : 0}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-white/60 font-bold">
                            No safety data available
                        </div>
                    )}
                </div>

                {/* Project Equipment - DPR Style Chart */}
                <ProjectEquipmentChart data={equipmentChartData} />

                {/* Cashflow Section - Only for Billing Site Engineer */}
                {isBillingSiteEngineer && (
                    <div className="glass-card p-6 rounded-[2rem] mt-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-black text-contrast uppercase tracking-tight">Cash Flow</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Cash In/Out</p>
                            </div>
                            <button
                                onClick={() => {
                                    setCashflowForm(prev => ({ ...prev, project_name: projectName }));
                                    setIsCashflowModalOpen(true);
                                }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-500 transition-colors"
                            >
                                + Add Cash Flow
                            </button>
                        </div>

                        {/* Cash In vs Cash Out Chart */}
                        {cashflowData.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-slate-300 mb-4">Cash In vs Cash Out</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={cashflowData.map(cf => ({
                                            month: cf.month_year,
                                            'Cash In': cf.cash_in_monthly_actual || 0,
                                            'Cash Out': cf.cash_out_monthly_actual || 0
                                        }))}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                            <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                                            <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                                labelStyle={{ color: '#f1f5f9' }}
                                                itemStyle={{ color: '#f1f5f9' }}
                                                formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                                            />
                                            <Legend />
                                            <Bar dataKey="Cash In" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Cash Out" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Cashflow Table */}
                        {cashflowLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                            </div>
                        ) : cashflowData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-3 px-4 text-slate-400 font-bold uppercase text-[10px]">Month</th>
                                            <th className="text-right py-3 px-4 text-emerald-400 font-bold uppercase text-[10px]">Cash-In Plan</th>
                                            <th className="text-right py-3 px-4 text-emerald-400 font-bold uppercase text-[10px]">Cash-In Actual</th>
                                            <th className="text-right py-3 px-4 text-rose-400 font-bold uppercase text-[10px]">Cash-Out Plan</th>
                                            <th className="text-right py-3 px-4 text-rose-400 font-bold uppercase text-[10px]">Cash-Out Actual</th>
                                            <th className="text-right py-3 px-4 text-amber-400 font-bold uppercase text-[10px]">Actual Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cashflowData.map((cf, idx) => (
                                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="py-3 px-4 font-bold text-contrast">{cf.month_year}</td>
                                                <td className="py-3 px-4 text-right text-emerald-400 font-mono">₹{(cf.cash_in_monthly_plan || 0).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right text-emerald-400 font-mono">₹{(cf.cash_in_monthly_actual || 0).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right text-rose-400 font-mono">₹{(cf.cash_out_monthly_plan || 0).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right text-rose-400 font-mono">₹{(cf.cash_out_monthly_actual || 0).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right text-amber-400 font-mono">₹{(cf.actual_cost_monthly || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <p className="font-bold">No cash flow data available</p>
                                <p className="text-xs mt-1">Click "Add Cash Flow" to add monthly data</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Cashflow Modal */}
                {isCashflowModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <h3 className="text-lg font-black text-contrast uppercase mb-4">Add Cash Flow Data</h3>
                            <form onSubmit={handleCashflowSubmit}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Month (e.g., Jan-2026)</label>
                                        <input
                                            type="text"
                                            name="month_year"
                                            value={cashflowForm.month_year}
                                            onChange={handleCashflowChange}
                                            placeholder="Jan-2026"
                                            required
                                            className="w-full px-4 py-3 bg-slate-700 rounded-xl text-sm font-bold text-contrast placeholder-white/30"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Cash-In Monthly Plan (₹)</label>
                                            <input
                                                type="number"
                                                name="cash_in_monthly_plan"
                                                value={cashflowForm.cash_in_monthly_plan}
                                                onChange={handleCashflowChange}
                                                min="0"
                                                className="w-full px-4 py-3 bg-slate-700 rounded-xl text-sm font-bold text-contrast"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Cash-In Monthly Actual (₹)</label>
                                            <input
                                                type="number"
                                                name="cash_in_monthly_actual"
                                                value={cashflowForm.cash_in_monthly_actual}
                                                onChange={handleCashflowChange}
                                                min="0"
                                                className="w-full px-4 py-3 bg-slate-700 rounded-xl text-sm font-bold text-contrast"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-1">Cash-Out Monthly Plan (₹)</label>
                                            <input
                                                type="number"
                                                name="cash_out_monthly_plan"
                                                value={cashflowForm.cash_out_monthly_plan}
                                                onChange={handleCashflowChange}
                                                min="0"
                                                className="w-full px-4 py-3 bg-slate-700 rounded-xl text-sm font-bold text-contrast"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-1">Cash-Out Monthly Actual (₹)</label>
                                            <input
                                                type="number"
                                                name="cash_out_monthly_actual"
                                                value={cashflowForm.cash_out_monthly_actual}
                                                onChange={handleCashflowChange}
                                                min="0"
                                                className="w-full px-4 py-3 bg-slate-700 rounded-xl text-sm font-bold text-contrast"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">Actual Cost Monthly (₹)</label>
                                        <input
                                            type="number"
                                            name="actual_cost_monthly"
                                            value={cashflowForm.actual_cost_monthly}
                                            onChange={handleCashflowChange}
                                            min="0"
                                            className="w-full px-4 py-3 bg-slate-700 rounded-xl text-sm font-bold text-contrast"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsCashflowModalOpen(false)}
                                        className="flex-1 px-4 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-500 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={cashflowLoading}
                                        className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50"
                                    >
                                        {cashflowLoading ? 'Saving...' : 'Save Cash Flow'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SiteEngineerDashboard;
