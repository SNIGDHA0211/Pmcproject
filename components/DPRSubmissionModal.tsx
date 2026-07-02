
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Project, DPRActivityInput, LaborLog, MachineryLog } from '../types';

interface DPRSubmissionModalProps {
  onClose: () => void;
  onSubmit: (dprData: any) => void;
  assignedProjects: Project[];
}

const DPRSubmissionModal: React.FC<DPRSubmissionModalProps> = ({ onClose, onSubmit, assignedProjects }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState(assignedProjects[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [labor, setLabor] = useState<LaborLog>({ skilled: 0, unskilled: 0, operators: 0, security: 0 });
  const [machinery, setMachinery] = useState<MachineryLog[]>([
    { name: 'Tower Crane', count: 0, status: 'Operational' },
    { name: 'JCB', count: 0, status: 'Operational' },
    { name: 'Poclain', count: 0, status: 'Operational' },
    { name: 'Dumper', count: 0, status: 'Operational' }
  ]);
  
  const [activityInputs, setActivityInputs] = useState<Record<string, number>>({});
  const [criticalIssues, setCriticalIssues] = useState('');
  const [billingStatus, setBillingStatus] = useState('');

  const selectedProject = assignedProjects.find(p => p.id === selectedProjectId);

  const handleActivityChange = (id: string, value: string) => {
    setActivityInputs(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
  };

  const handleMachineryChange = (index: number, field: keyof MachineryLog, value: any) => {
    const updated = [...machinery];
    updated[index] = { ...updated[index], [field]: value };
    setMachinery(updated);
  };

  const calculateTotalLabor = () => labor.skilled + labor.unskilled + labor.operators + labor.security;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = {
      projectId: selectedProjectId,
      projectName: selectedProject?.title,
      date: new Date(date).toLocaleDateString('en-GB'),
      labor,
      machinery,
      activityProgress: Object.entries(activityInputs).map(([id, val]) => ({
        activityId: id,
        todayProgress: val
      })),
      criticalIssues,
      billingStatus,
      status: 'PENDING'
    };
    onSubmit(submissionData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border border-white/10">
        {/* Header */}
        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase rounded-full">Step {activeStep} of 3</span>
              <h3 className="text-2xl font-black text-contrast uppercase tracking-tight">Daily Progress Report</h3>
            </div>
            <p className="muted font-bold text-xs tracking-tight uppercase">Site Execution Management System</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 text-white/40 hover:text-rose-500 rounded-2xl transition-all shadow-sm">
            <Icons.Reject size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <form id="dpr-form" onSubmit={handleSubmit} className="space-y-12">
            
            {/* STEP 1: GENERAL & RESOURCES */}
            {activeStep === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                    >
                      {assignedProjects.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Reporting Date</label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-contrast uppercase tracking-widest">Labor Deployment</h4>
                    <span className="text-[10px] font-black text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded-full">Total: {calculateTotalLabor()} Personnel</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Skilled', key: 'skilled' as keyof LaborLog },
                      { label: 'Unskilled', key: 'unskilled' as keyof LaborLog },
                      { label: 'Operators', key: 'operators' as keyof LaborLog },
                      { label: 'Security', key: 'security' as keyof LaborLog }
                    ].map(type => (
                      <div key={type.key} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <label className="text-[10px] font-black muted uppercase mb-2 block">{type.label}</label>
                        <input 
                          type="number"
                          value={labor[type.key]}
                          onChange={(e) => setLabor({...labor, [type.key]: parseInt(e.target.value) || 0})}
                          className="w-full bg-transparent text-xl font-black text-contrast outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: MACHINERY & EQUIPMENT */}
            {activeStep === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-sm font-black text-contrast uppercase tracking-widest">Equipment Log</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {machinery.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl group hover:border-indigo-500/30 transition-all">
                      <div className="flex-1">
                        <p className="text-xs font-black text-contrast uppercase">{m.name}</p>
                        <select 
                          value={m.status}
                          onChange={(e) => handleMachineryChange(idx, 'status', e.target.value)}
                          className="text-[10px] font-bold bg-transparent text-indigo-400 outline-none mt-1"
                        >
                          <option value="Operational" className="bg-slate-900">Operational</option>
                          <option value="Breakdown" className="bg-slate-900">Breakdown</option>
                          <option value="Idle" className="bg-slate-900">Idle</option>
                        </select>
                      </div>
                      <input 
                        type="number"
                        value={m.count}
                        onChange={(e) => handleMachineryChange(idx, 'count', parseInt(e.target.value) || 0)}
                        className="w-16 bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-center font-black text-contrast"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: WORK DESCRIPTION & ISSUES */}
            {activeStep === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Work Description & Progress</label>
                  <textarea 
                    value={criticalIssues}
                    onChange={(e) => setCriticalIssues(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm font-medium text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10 h-40 resize-none"
                    placeholder="Describe activities completed today, materials used, and physical progress achieved..."
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Critical Issues / Bottlenecks</label>
                  <input 
                    type="text"
                    value={billingStatus}
                    onChange={(e) => setBillingStatus(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="e.g. Cement shortage, utility shifting delay..."
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${s === activeStep ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : s < activeStep ? 'bg-indigo-500/40' : 'bg-white/10'}`}></div>
            ))}
          </div>
          
          <div className="flex gap-4">
            {activeStep > 1 && (
              <button 
                onClick={() => setActiveStep(prev => prev - 1)}
                className="px-8 py-4 muted font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/5 transition-all"
              >
                Previous
              </button>
            )}
            
            {activeStep < 3 ? (
              <button 
                onClick={() => setActiveStep(prev => prev + 1)}
                className="px-12 py-4 bg-indigo-600 text-contrast font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all flex items-center gap-2"
              >
                Next Stage <Icons.ChevronRight size={16} />
              </button>
            ) : (
              <button 
                type="submit"
                form="dpr-form"
                className="px-12 py-4 bg-emerald-600 text-contrast font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all"
              >
                Finalize & Submit DPR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DPRSubmissionModal;
