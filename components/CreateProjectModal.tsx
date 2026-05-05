import React, { useState, useRef } from 'react';
import { Icons } from './Icons';
import { Project, Document } from '../types';
import { useTheme, getThemeClasses } from '../utils/theme';

interface CreateProjectModalProps {
  onClose: () => void;
  onSubmit: (project: Partial<Project>, documents: Partial<Document>[], documentationFile?: File) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onSubmit }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [formData, setFormData] = useState({
    title: '',
    client: '',
    location: '',
    budget: '',
    description: '',
    commencementDate: '',
    duration: '',
    salientFeatures: '',
    siteStaffDetails: '',
    hasDocumentation: false,
    hasISOChecklist: false,
    hasTestFrequencyChart: false,
  });
  
  const [documentationFile, setDocumentationFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDocumentationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentationFile(e.target.files[0]);
      setFormData({ ...formData, hasDocumentation: true });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      ...formData,
      budget: Number(formData.budget)
    }, [], documentationFile || undefined);
  };

  const renderToggle = (label: string, key: keyof typeof formData) => (
    <div className={`flex items-center justify-between py-3 border-b last:border-0 ${isDarkTheme ? 'border-white/5' : 'border-gray-100'}`}>
      <div className="flex flex-col gap-1">
        <span className={`text-sm font-bold ${themeClasses.textPrimary}`}>{label}</span>
        {key === 'hasDocumentation' && (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleDocumentationFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                isDarkTheme ? 'bg-white/5 text-indigo-400 hover:bg-white/10' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              <Icons.Upload size={12} />
              {documentationFile ? documentationFile.name : 'Upload Document'}
            </button>
            {documentationFile && (
              <button
                type="button"
                onClick={() => {
                  setDocumentationFile(null);
                  setFormData({ ...formData, hasDocumentation: false });
                }}
                className="text-rose-500 hover:text-rose-700"
              >
                <Icons.Reject size={14} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className={`font-black text-xs ${themeClasses.textSecondary}`}>-</span>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, [key]: !formData[key] })}
          className={`w-24 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            formData[key]
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : (isDarkTheme ? 'bg-white/5 text-white/20' : 'bg-gray-100 text-gray-400')
          }`}
        >
          {formData[key] ? 'YES' : 'NO'}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md p-4 transition-all duration-300 ${
      isDarkTheme ? 'bg-black/90' : 'bg-slate-900/40'
    }`}>
      <div className={`w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border ${
        isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'
      }`}>
        <div className="p-12 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className={`text-4xl font-black uppercase tracking-tighter ${themeClasses.textPrimary}`}>Initiate Project</h3>
              <p className={`text-xs font-black uppercase tracking-widest mt-1 ${themeClasses.textSecondary}`}>Enterprise Portfolio Integration</p>
            </div>
            <button onClick={onClose} className={`p-4 rounded-2xl transition-all group ${
              isDarkTheme ? 'bg-white/5 text-white/40 hover:text-rose-500' : 'bg-gray-50 text-gray-400 hover:text-rose-600'
            }`}>
              <Icons.Reject size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${themeClasses.textSecondary}`}>Project Name</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 transition-all ${
                    themeClasses.input
                  } ${themeClasses.textPrimary} ${themeClasses.placeholder} ${
                    isDarkTheme ? 'focus:ring-indigo-500/10' : 'focus:ring-indigo-500/20'
                  }`}
                  placeholder="Enter project name..."
                />
              </div>

              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${themeClasses.textSecondary}`}>Client Organization</label>
                <input
                  type="text"
                  required
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className={`w-full rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 transition-all ${
                    themeClasses.input
                  } ${themeClasses.textPrimary} ${themeClasses.placeholder} ${
                    isDarkTheme ? 'focus:ring-indigo-500/10' : 'focus:ring-indigo-500/20'
                  }`}
                  placeholder="Client name..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${themeClasses.textSecondary}`}>Location</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className={`w-full rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 transition-all ${
                      themeClasses.input
                    } ${themeClasses.textPrimary} ${themeClasses.placeholder} ${
                      isDarkTheme ? 'focus:ring-indigo-500/10' : 'focus:ring-indigo-500/20'
                    }`}
                    placeholder="City, State"
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${themeClasses.textSecondary}`}>Budget (INR)</label>
                  <input
                    type="number"
                    required
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className={`w-full rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 transition-all ${
                      themeClasses.input
                    } ${themeClasses.textPrimary} ${themeClasses.placeholder} ${
                      isDarkTheme ? 'focus:ring-indigo-500/10' : 'focus:ring-indigo-500/20'
                    }`}
                    placeholder="Value in ₹"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${themeClasses.textSecondary}`}>Project Scope</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 transition-all h-32 resize-none ${
                    themeClasses.input
                  } ${themeClasses.textPrimary} ${themeClasses.placeholder} ${
                    isDarkTheme ? 'focus:ring-indigo-500/10' : 'focus:ring-indigo-500/20'
                  }`}
                  placeholder="Detailed project description..."
                />
              </div>
            </div>

            <div className="space-y-8">
              <div className={`p-8 rounded-[2.5rem] border ${
                isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'
              }`}>
                <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 ${
                  isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'
                }`}>Quality & Documentation Checklist</h4>
                <div className="space-y-2">
                  {renderToggle('Project Documentation', 'hasDocumentation')}
                  {renderToggle('ISO Compliance Checklist', 'hasISOChecklist')}
                  {renderToggle('Test Frequency Chart', 'hasTestFrequencyChart')}
                </div>
              </div>

              <div className={`p-8 rounded-[2.5rem] border ${
                isDarkTheme ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDarkTheme ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    <Icons.History size={20} />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase ${themeClasses.textPrimary}`}>Audit Trail Initialized</p>
                    <p className={`text-[10px] font-bold ${themeClasses.textSecondary}`}>Every action is cryptographically tracked.</p>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-3"
                >
                  <Icons.Add size={16} />
                  Initialize Project
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
