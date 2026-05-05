import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { projectApi, notificationApi } from '../services/api';
import { User } from '../types';
import { useTheme, getThemeClasses } from '../utils/theme';

interface ProjectInitProps {
    user: User;
    onProjectCreated?: () => void;
}

interface ProjectInitForm {
    name: string;
    location: string;
    project_start: string;
    contract_finish: string;
    forecast_finish: string;
    original_contract_value: string;
    approved_vo: string;
    pending_vo: string;
    bac: string;
    working_hours_per_day: string;
    working_days_per_month: string;
    assigned_users: number[];
}

const ProjectInit: React.FC<ProjectInitProps> = ({ user, onProjectCreated }) => {
    const { isDarkTheme } = useTheme();
    const themeClasses = getThemeClasses(isDarkTheme);
    const [formData, setFormData] = useState<ProjectInitForm>({
        name: '',
        location: '',
        project_start: '',
        contract_finish: '',
        forecast_finish: '',
        original_contract_value: '',
        approved_vo: '',
        pending_vo: '',
        bac: '',
        working_hours_per_day: '8',
        working_days_per_month: '26',
        assigned_users: [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load existing projects on mount
    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setIsLoading(true);
            const response = await projectApi.getInitProjects();
            setProjects(response.data || []);
        } catch (err) {
            console.error('Failed to load projects:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        try {
            // Prepare the data
            const projectData = {
                name: formData.name,
                location: formData.location,
                project_start: formData.project_start,
                contract_finish: formData.contract_finish,
                forecast_finish: formData.forecast_finish || null,
                original_contract_value: parseFloat(formData.original_contract_value) || 0,
                approved_vo: parseFloat(formData.approved_vo) || 0,
                pending_vo: parseFloat(formData.pending_vo) || 0,
                bac: parseFloat(formData.bac) || 0,
                working_hours_per_day: parseFloat(formData.working_hours_per_day) || 8,
                working_days_per_month: parseInt(formData.working_days_per_month) || 26,
                assigned_users: formData.assigned_users,
            };

            const response = await projectApi.initProject(projectData);

            if (response.data.success) {
                setSuccess('Project initialized successfully!');
                // Send notification to PMC Coordinators
                try {
                    await notificationApi.sendProjectCreatedNotification(response.data.project.id);
                } catch (notificationError) {
                    console.error('Failed to send project created notification:', notificationError);
                    // Don't fail the whole operation if notification fails
                }
                // Reset form
                setFormData({
                    name: '',
                    location: '',
                    project_start: '',
                    contract_finish: '',
                    forecast_finish: '',
                    original_contract_value: '',
                    approved_vo: '',
                    pending_vo: '',
                    bac: '',
                    working_hours_per_day: '8',
                    working_days_per_month: '26',
                    assigned_users: [],
                });
                // Refresh projects list
                loadProjects();
                // Notify parent
                if (onProjectCreated) {
                    onProjectCreated();
                }
            } else {
                setError(response.data.errors || 'Failed to initialize project');
            }
        } catch (err: any) {
            console.error('Failed to initialize project:', err);
            setError(err.response?.data?.errors || err.response?.data?.detail || 'Failed to initialize project');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate auto-calculated fields for display
    const calculateValues = () => {
        const original = parseFloat(formData.original_contract_value) || 0;
        const approved = parseFloat(formData.approved_vo) || 0;
        const revised = original + approved;

        let delayDays = 0;
        if (formData.contract_finish && formData.forecast_finish) {
            const contract = new Date(formData.contract_finish);
            const forecast = new Date(formData.forecast_finish);
            delayDays = Math.floor((forecast.getTime() - contract.getTime()) / (1000 * 60 * 60 * 24));
        }

        return { revised, delayDays };
    };

    const { revised, delayDays } = calculateValues();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
                        Project Initialization
                    </h2>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                        Configure new construction project
                    </p>
                </div>
            </div>

            {/* Existing Projects Summary */}
            {!isLoading && projects.length > 0 && (
                <div className={`${themeClasses.glassCard} p-6 rounded-[2rem] border ${themeClasses.border}`}>
                    <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${themeClasses.textPrimary}`}>Initialized Projects</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.slice(0, 6).map((project) => (
                            <div key={project.id} className={`${themeClasses.bgSecondary} border ${themeClasses.border} rounded-xl p-4`}>
                                <p className={`text-sm font-black ${themeClasses.textPrimary}`}>{project.name}</p>
                                <p className={`text-[10px] font-bold uppercase mt-1 ${themeClasses.textSecondary}`}>{project.location}</p>
                                <div className={`mt-3 pt-3 border-t ${themeClasses.border}`}>
                                    <div className="flex justify-between text-[10px]">
                                        <span className={`font-bold ${themeClasses.textSecondary}`}>Revised Value:</span>
                                        <span className={`${themeClasses.success} font-black`}>₹{parseFloat(project.revised_contract_value || 0).toLocaleString()}</span>
                                    </div>
                                    {project.delay_days > 0 && (
                                        <div className="flex justify-between text-[10px] mt-1">
                                            <span className={`font-bold ${themeClasses.textSecondary}`}>Delay:</span>
                                            <span className={`${themeClasses.danger} font-black`}>{project.delay_days} days</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Project Initialization Form */}
            <div className={`${themeClasses.glassCard} p-8 rounded-[2rem] border ${themeClasses.border}`}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Success/Error Messages */}
                    {success && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-500 text-sm font-bold">
                            {success}
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm font-bold">
                            {error}
                        </div>
                    )}

                    {/* Basic Information */}
                    <div>
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Project Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-4 py-3 rounded-xl text-sm font-bold border outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder}`}
                                    placeholder="Enter project name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Location *</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-4 py-3 rounded-xl text-sm font-bold border outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder}`}
                                    placeholder="Enter location"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Project Dates */}
                    <div>
                        <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>Project Dates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Project Start *</label>
                                <input
                                    type="date"
                                    name="project_start"
                                    value={formData.project_start}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-4 py-3 rounded-xl text-sm font-bold border outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Contract Finish *</label>
                                <input
                                    type="date"
                                    name="contract_finish"
                                    value={formData.contract_finish}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-4 py-3 rounded-xl text-sm font-bold border outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Forecast Finish</label>
                                <input
                                    type="date"
                                    name="forecast_finish"
                                    value={formData.forecast_finish}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 rounded-xl text-sm font-bold border outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
                                />
                            </div>
                        </div>
                        {/* Calculated Delay */}
                    {delayDays !== 0 && (
                        <div className={`mt-3 p-3 rounded-xl border ${isDarkTheme ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.danger}`}>
                                Calculated Delay: {delayDays} days
                            </p>
                        </div>
                    )}
                </div>

                {/* Contract Values */}
                <div>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>Contract Values (₹)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Original Contract Value *</label>
                            <input
                                type="number"
                                name="original_contract_value"
                                value={formData.original_contract_value}
                                onChange={handleChange}
                                required
                                min="0"
                                className={`w-full px-4 py-3 rounded-xl text-sm font-bold border outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder}`}
                                placeholder="Enter original contract value"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Approved VO *</label>
                            <input
                                type="number"
                                name="approved_vo"
                                value={formData.approved_vo}
                                onChange={handleChange}
                                required
                                min="0"
                                className={`w-full px-4 py-3 rounded-xl text-sm font-bold border outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder}`}
                                placeholder="Enter approved VO"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Pending VO *</label>
                            <input
                                type="number"
                                name="pending_vo"
                                value={formData.pending_vo}
                                onChange={handleChange}
                                required
                                min="0"
                                className={`w-full px-4 py-3 rounded-xl text-sm font-bold border outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder}`}
                                placeholder="Enter pending VO"
                            />
                        </div>
                    </div>
                    {/* Calculated Revised Value */}
                    {revised > 0 && (
                        <div className={`mt-3 p-3 rounded-xl border ${isDarkTheme ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.success}`}>
                                Revised Contract Value: ₹{revised.toLocaleString()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Budget */}
                <div>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>Budget</h3>
                    <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Budget at Completion (BAC) *</label>
                        <input
                            type="number"
                            name="bac"
                            value={formData.bac}
                            onChange={handleChange}
                            required
                            min="0"
                            className={`w-full px-4 py-3 rounded-xl text-sm font-bold border outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder}`}
                            placeholder="Enter BAC"
                        />
                    </div>
                </div>

                {/* Work Configuration */}
                <div>
                    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${themeClasses.textSecondary}`}>Work Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Working Hours/Day *</label>
                            <input
                                type="number"
                                name="working_hours_per_day"
                                value={formData.working_hours_per_day}
                                onChange={handleChange}
                                required
                                min="0"
                                step="0.5"
                                className={`w-full px-4 py-3 rounded-xl text-sm font-bold border outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder}`}
                                placeholder="Enter working hours per day"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Working Days/Month *</label>
                            <input
                                type="number"
                                name="working_days_per_month"
                                value={formData.working_days_per_month}
                                onChange={handleChange}
                                required
                                min="1"
                                max="31"
                                className={`w-full px-4 py-3 rounded-xl text-sm font-bold border outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder}`}
                                placeholder="Enter working days per month"
                            />
                        </div>
                    </div>
                </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-2xl shadow-xl transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {isSubmitting ? 'Initializing...' : 'Initialize Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectInit;
