
import React, { useState } from 'react';
import { Icons } from './Icons';
import { User, UserRole } from '../types';
import { useTheme, getThemeClasses } from '../utils/theme';

interface AssignmentModalProps {
  users: User[];
  onClose: () => void;
  onConfirm: (teamLeadId: string, coordinatorIds: string[]) => void;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ users, onClose, onConfirm }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<string[]>([]);

  const teamLeads = users.filter(u => u.role === UserRole.TEAM_LEAD);
  const coordinators = users.filter(u => u.role === UserRole.COORDINATOR);

  const toggleCoord = (id: string) => {
    setSelectedCoords(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (selectedLead) {
      onConfirm(selectedLead, selectedCoords);
    }
  };

  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-md p-4 transition-all duration-300 ${
      isDarkTheme ? 'bg-black/90' : 'bg-slate-900/40'
    }`}>
      <div className={`w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col h-[85vh]">
          {/* Header */}
          <div className={`p-10 border-b flex items-center justify-between ${themeClasses.border} ${themeClasses.bgSecondary}`}>
            <div>
              <h3 className={`text-3xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>Deploy Strategic Team</h3>
              <p className={`font-bold text-sm tracking-tight uppercase mt-1 ${themeClasses.textSecondary}`}>Select Human Resources for Project Execution</p>
            </div>
            <button onClick={onClose} className={`p-4 border transition-all shadow-sm rounded-2xl ${isDarkTheme ? 'bg-white/5 border-white/10 text-slate-400 hover:text-contrast' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700'}`}>
              <Icons.Reject size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-12">
            {/* Team Lead Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                  <div className="w-2 h-2 rounded-full bg-indigo-600"></div> Mandatory: Primary Team Lead
                </h4>
                <span className={`text-[10px] font-black uppercase ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`}>Select One Resource</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamLeads.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedLead(user.id)}
                    className={`p-5 rounded-[2rem] border-2 text-left transition-all relative group overflow-hidden ${
                      selectedLead === user.id 
                        ? (isDarkTheme ? 'border-indigo-600 bg-indigo-600/10 shadow-xl shadow-indigo-900/20' : 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100')
                        : (isDarkTheme ? 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10' : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100/50')
                    }`}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl border-2 shadow-md overflow-hidden ${isDarkTheme ? 'border-white/10 bg-slate-800' : 'border-gray-100 bg-white'}`}>
                        <img src={user.avatar} className="w-full h-full object-cover" alt={user.name} />
                      </div>
                      <div>
                        <p className={`text-sm font-black leading-tight ${themeClasses.textPrimary}`}>{user.name}</p>
                        <p className={`text-[10px] font-bold uppercase mt-1 ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`}>Team Lead</p>
                      </div>
                    </div>
                    {selectedLead === user.id && (
                      <div className={`absolute top-4 right-4 ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        <Icons.Approve size={20} />
                      </div>
                    )}
                    <div className={`absolute -bottom-8 -right-8 opacity-5 group-hover:opacity-10 transition-opacity ${isDarkTheme ? 'text-white' : 'text-black'}`}>
                      <Icons.User size={80} />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Coordinators Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div> Support: Project Coordinators
                </h4>
                <span className={`text-[10px] font-black uppercase ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`}>Multi-Select Enabled ({selectedCoords.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coordinators.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleCoord(user.id)}
                    className={`p-5 rounded-[2rem] border-2 text-left transition-all relative group overflow-hidden ${
                      selectedCoords.includes(user.id)
                        ? (isDarkTheme ? 'border-blue-500 bg-blue-500/10 shadow-xl shadow-blue-900/20' : 'border-blue-400 bg-blue-50 shadow-lg shadow-blue-100')
                        : (isDarkTheme ? 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10' : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100/50')
                    }`}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-12 h-12 rounded-2xl border-2 shadow-md overflow-hidden ${isDarkTheme ? 'border-white/10 bg-slate-800' : 'border-gray-100 bg-white'}`}>
                        <img src={user.avatar} className="w-full h-full object-cover" alt={user.name} />
                      </div>
                      <div>
                        <p className={`text-sm font-black leading-tight ${themeClasses.textPrimary}`}>{user.name}</p>
                        <p className={`text-[10px] font-bold uppercase mt-1 ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`}>Coordinator</p>
                      </div>
                    </div>
                    {selectedCoords.includes(user.id) && (
                      <div className={`absolute top-4 right-4 ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}`}>
                        <Icons.Approve size={18} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className={`p-10 border-t flex items-center justify-between ${themeClasses.border} ${themeClasses.bgSecondary}`}>
            <div className="flex items-center gap-6">
              <div className="flex -space-x-3">
                {users.filter(u => u.id === selectedLead || selectedCoords.includes(u.id)).map(u => (
                  <img key={u.id} src={u.avatar} className={`w-10 h-10 rounded-full border-4 shadow-sm ring-1 ${isDarkTheme ? 'border-slate-900 ring-white/10' : 'border-white ring-gray-200'}`} />
                ))}
              </div>
              {selectedLead ? (
                <p className={`text-xs font-bold ${themeClasses.textSecondary}`}>
                  Ready to deploy <span className={themeClasses.textPrimary}>{selectedCoords.length + 1}</span> resources to field operations.
                </p>
              ) : (
                <p className="text-xs font-bold text-rose-500">Please designate a primary Team Lead to continue.</p>
              )}
            </div>
            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className={`px-8 py-4 font-black text-xs uppercase tracking-widest transition-all rounded-2xl ${isDarkTheme ? 'text-slate-400 bg-white/5 hover:bg-white/10' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button 
                disabled={!selectedLead}
                onClick={handleConfirm}
                className={`px-12 py-4 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all ${
                  selectedLead 
                    ? 'bg-indigo-600 shadow-2xl shadow-indigo-900/40 hover:bg-indigo-700' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentModal;
