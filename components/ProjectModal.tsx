
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { Project, Document } from '../types';
import { useTheme, getThemeClasses } from '../utils/theme';

interface ProjectModalProps {
  onClose: () => void;
  onSubmit: (project: Partial<Project>, documents: Partial<Document>[]) => void;
  initialData?: Project;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ onClose, onSubmit, initialData }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const isEdit = !!initialData;
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    client: initialData?.client || '',
    location: initialData?.location || '',
    budget: initialData?.budget?.toString() || '',
    description: initialData?.description || ''
  });
  
  const [selectedFiles, setSelectedFiles] = useState<{name: string, size: string, type: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).map((f: File) => ({
        name: f.name,
        size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: f.name.split('.').pop()?.toUpperCase() || 'DOC'
      }));
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const docs: Partial<Document>[] = selectedFiles.map((f, i) => ({
      id: `new-doc-${Date.now()}-${i}`,
      name: f.name,
      type: f.type,
      url: '#',
      uploadedAt: new Date().toISOString(),
      status: 'PENDING',
      version: 1
    }));

    onSubmit({
      ...formData,
      budget: Number(formData.budget)
    }, docs);
  };

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm p-4 transition-all duration-300 ${
      isDarkTheme ? 'bg-black/90' : 'bg-slate-900/40'
    }`}>
      <div className={`w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
        <div className="p-10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className={`text-3xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
                {isEdit ? 'Modify Asset' : 'Initiate Project'}
              </h3>
              <p className={`font-bold text-sm tracking-tight uppercase mt-1 ${themeClasses.textSecondary}`}>
                {isEdit ? `Editing ID: #${initialData?.id.toUpperCase()}` : 'Strategic Infrastructure Asset Creation'}
              </p>
            </div>
            <button onClick={onClose} className={`p-3 transition-all rounded-2xl ${isDarkTheme ? 'bg-white/5 text-white/40 hover:text-rose-500' : 'bg-gray-50 text-gray-500 hover:text-rose-600'}`}>
              <Icons.Reject size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Project Title</label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className={`w-full px-5 py-3 border rounded-xl outline-none transition-all font-bold text-sm ${themeClasses.input} ${themeClasses.textPrimary} ${themeClasses.placeholder} ${isDarkTheme ? 'focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500' : 'focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'}`}
                  placeholder="e.g. Eastern Flyover Ext."
                />
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Client Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.client}
                  onChange={(e) => setFormData({...formData, client: e.target.value})}
                  className={`w-full px-5 py-3 border rounded-xl outline-none transition-all font-bold text-sm ${themeClasses.input} ${themeClasses.textPrimary} ${themeClasses.placeholder} ${isDarkTheme ? 'focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500' : 'focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'}`}
                  placeholder="e.g. NHAI / NHIT"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Location</label>
                <input 
                  required
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className={`w-full px-5 py-3 border rounded-xl outline-none transition-all font-bold text-sm ${themeClasses.input} ${themeClasses.textPrimary} ${themeClasses.placeholder} ${isDarkTheme ? 'focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500' : 'focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'}`}
                  placeholder="e.g. Mumbai, MH"
                />
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Budget (INR)</label>
                <input 
                  required
                  type="number" 
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  className={`w-full px-5 py-3 border rounded-xl outline-none transition-all font-bold text-sm ${themeClasses.input} ${themeClasses.textPrimary} ${themeClasses.placeholder} ${isDarkTheme ? 'focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500' : 'focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'}`}
                  placeholder="e.g. 45000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Description</label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className={`w-full px-5 py-3 border rounded-xl outline-none transition-all font-bold text-sm resize-none ${themeClasses.input} ${themeClasses.textPrimary} ${themeClasses.placeholder} ${isDarkTheme ? 'focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500' : 'focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400'}`}
                placeholder="Enter project overview..."
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  {isEdit ? 'Additional Documentation' : 'Initial Documentation'}
                </label>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${isDarkTheme ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`}
                >
                  <Icons.Add size={12} /> Add Files
                </button>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden" 
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 border rounded-2xl animate-in slide-in-from-top-1 ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border ${isDarkTheme ? 'bg-white/10 text-indigo-400 border-white/10' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                        <Icons.Document size={16} />
                      </div>
                      <div>
                        <p className={`text-xs font-black ${themeClasses.textPrimary}`}>{f.name}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>{f.size} • {f.type}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeFile(i)}
                      className={`p-2 transition-all duration-200 ${isDarkTheme ? 'text-white/20 hover:text-rose-500 hover:bg-rose-500/10' : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'}`}
                    >
                      <Icons.Reject size={16} />
                    </button>
                  </div>
                ))}
              </div>
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
                {isEdit ? 'Update Asset' : 'Initiate Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
