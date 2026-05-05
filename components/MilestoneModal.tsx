
import React, { useState } from 'react';
import { Icons } from './Icons';
import { User, Task } from '../types';
import { useTheme, getThemeClasses } from '../utils/theme';

interface MilestoneModalProps {
  onClose: () => void;
  onSubmit: (task: Partial<Task>) => void;
  teamMembers: User[];
}

const MilestoneModal: React.FC<MilestoneModalProps> = ({ onClose, onSubmit, teamMembers }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    assignedTo: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      status: 'PENDING'
    });
  };

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center backdrop-blur-sm p-4 transition-all duration-300 ${
      isDarkTheme ? 'bg-black/90' : 'bg-slate-900/40'
    }`}>
      <div className={`w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
        <div className="p-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className={`text-3xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>Add Milestone</h3>
              <p className={`font-bold text-sm tracking-tight uppercase ${themeClasses.textSecondary}`}>Define Site Execution Task</p>
            </div>
            <button onClick={onClose} className={`p-3 transition-all rounded-2xl ${isDarkTheme ? 'bg-white/5 text-white/40 hover:text-rose-500' : 'bg-gray-50 text-gray-500 hover:text-rose-600'}`}>
              <Icons.Reject size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Milestone Title</label>
              <input 
                required
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className={`w-full px-5 py-3 border rounded-xl outline-none transition-all font-bold text-sm ${themeClasses.input} ${themeClasses.textPrimary} ${themeClasses.placeholder} ${isDarkTheme ? 'focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500' : 'focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'}`}
                placeholder="e.g. Foundation Pouring"
              />
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Due Date</label>
              <input 
                required
                type="date" 
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className={`w-full px-5 py-3 border rounded-xl outline-none transition-all font-bold text-sm ${themeClasses.input} ${themeClasses.textPrimary} ${isDarkTheme ? 'focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500' : 'focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'}`}
              />
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Assign To Team Member</label>
              <div className="relative">
                <select
                  required
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                  className={`w-full px-5 py-3 border rounded-xl outline-none transition-all font-bold text-sm appearance-none ${themeClasses.input} ${themeClasses.textPrimary} ${isDarkTheme ? 'focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500' : 'focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'}`}
                >
                  <option value="" className={isDarkTheme ? 'bg-slate-900' : 'bg-white'}>Select Resource...</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id} className={isDarkTheme ? 'bg-slate-900' : 'bg-white'}>{member.name} ({member.role.replace('_', ' ')})</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none muted">
                  <Icons.ChevronRight className="rotate-90" size={16} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Description & Requirements</label>
              <textarea 
                required
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className={`w-full h-24 px-5 py-3 border rounded-xl outline-none transition-all font-bold text-sm ${themeClasses.input} ${themeClasses.textPrimary} ${themeClasses.placeholder} ${isDarkTheme ? 'focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500' : 'focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'}`}
                placeholder="Specific execution details..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={onClose}
                className={`flex-1 py-4 font-black text-xs uppercase tracking-widest rounded-2xl transition-all ${isDarkTheme ? 'text-slate-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
              >
                Create Milestone
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MilestoneModal;
