import React from 'react';
import { Project } from '../types';
import { Icons } from './Icons';
import { useTheme, getThemeClasses } from '../utils/theme';

interface SiteExecutionProps {
  projects: Project[];
  onViewProject: (id: string) => void;
}

const SiteExecution: React.FC<SiteExecutionProps> = ({ projects, onViewProject }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  // For now, we'll just display a placeholder. We can add more complex charts and data later.
  const inProgressProjects = projects.filter(p => p.status === 'IN_PROGRESS');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
            Site Execution Overview
          </h2>
          <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
            Live progress of all active construction sites
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inProgressProjects.map(project => (
          <div 
            key={project.id} 
            onClick={() => onViewProject(project.id)}
            className={`${themeClasses.glassCard} p-6 rounded-[2rem] border ${themeClasses.border} shadow-lg hover:shadow-xl hover:border-indigo-500/50 transition-all cursor-pointer group`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-black text-lg uppercase tracking-tight group-hover:text-indigo-400 transition-colors ${themeClasses.textPrimary}`}>{project.title}</h3>
              <div className={`p-2 rounded-xl ${themeClasses.bgSecondary}`}>
                <Icons.Execution size={20} className="text-indigo-400" />
              </div>
            </div>
            <p className={`text-xs font-bold mb-4 ${themeClasses.textSecondary}`}>{project.location}</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className={`font-bold ${themeClasses.textSecondary}`}>Progress</span>
                <span className={`font-black ${themeClasses.textPrimary}`}>{project.progress?.construction || 0}%</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${themeClasses.bgSecondary}`}>
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
                  style={{ width: `${project.progress?.construction || 0}%` }}
                ></div>
              </div>
            </div>

            <div className={`mt-6 pt-4 border-t ${themeClasses.border} flex justify-between items-center`}>
                <div className="text-left">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Manpower</p>
                    <p className={`text-sm font-black ${themeClasses.textPrimary}`}>{project.safety?.totalManhours || 0}</p>
                </div>
                 <div className="text-right">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Status</p>
                    <p className={`text-sm font-black ${themeClasses.success}`}>On Track</p>
                </div>
            </div>
          </div>
        ))}

        {inProgressProjects.length === 0 && (
            <div className={`lg:col-span-3 text-center py-20 border ${themeClasses.glassCard} ${themeClasses.border} rounded-[2rem]`}>
                <Icons.Execution size={48} className={`mx-auto mb-4 ${themeClasses.textMuted} opacity-20`} />
                <h3 className={`text-lg font-black uppercase ${themeClasses.textPrimary}`}>No Active Sites</h3>
                <p className={`text-sm ${themeClasses.textSecondary}`}>There are currently no projects in the execution phase.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default SiteExecution;
