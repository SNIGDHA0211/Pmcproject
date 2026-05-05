
import React from 'react';
import { Project, UserRole, User, ProjectStatus } from '../types';
import { Icons } from './Icons';
import { formatINR } from '../App';

interface ReportGeneratorProps {
  project: Project;
  onClose: () => void;
  user: User;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ project, onClose, user }) => {
  const isFinalReport = project.status === ProjectStatus.APPROVED;
  const reportDate = isFinalReport ? 'PROJECT CLOSURE - 2026' : 'DECEMBER 2025';

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md overflow-y-auto p-4 md:p-10 flex justify-center">
      <div className="bg-slate-900 w-full max-w-4xl min-h-[11in] shadow-2xl rounded-none md:rounded-lg overflow-hidden flex flex-col print:shadow-none print:w-full relative border border-white/10 print:bg-white print:text-black">
        
        {/* Completion Watermark for Final Reports */}
        {isFinalReport && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none rotate-45">
            <h1 className="text-[200px] font-black uppercase text-white tracking-tighter">COMPLETED</h1>
          </div>
        )}

        {/* Sticky Header for UI Controls (Hidden in Print) */}
        <div className="bg-slate-900/80 backdrop-blur-md p-4 border-b border-white/10 flex items-center justify-between print:hidden z-20">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center text-white font-black ${isFinalReport ? 'bg-emerald-600' : 'bg-indigo-600'}`}>P</div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-contrast">
                {isFinalReport ? 'Final Project Closure Report' : 'Monthly Progress Report Preview'}
              </h2>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tight">{project.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isFinalReport ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              <Icons.Download size={14} /> {isFinalReport ? 'Download Completion Cert' : 'Download PDF / Print'}
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-contrast transition-colors"
            >
              <Icons.Reject size={20} />
            </button>
          </div>
        </div>

        {/* The Actual Report Content */}
        <div className="flex-1 p-12 md:p-16 space-y-12 text-contrast font-serif leading-relaxed relative z-10 print:text-black">
          
          {/* Cover Page Replication */}
          <div className={`text-center space-y-8 py-10 border-b-4 border-double ${isFinalReport ? 'border-emerald-900/30' : 'border-white/10'}`}>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Infrastructure Asset Command Center</p>
            <h1 className="text-4xl font-black uppercase tracking-tight leading-[1.1] max-w-3xl mx-auto text-contrast print:text-black">
              {project.title.toUpperCase()}
            </h1>
            
            {isFinalReport ? (
              <div className="py-10">
                <div className="inline-block p-10 border-4 border-emerald-600 rounded-[2rem] bg-emerald-600/5">
                  <div className="flex flex-col items-center">
                    <Icons.Approve size={64} className="text-emerald-500 mb-4" />
                    <span className="text-5xl font-black text-emerald-400">FINAL CLOSURE</span>
                    <p className="text-lg font-bold tracking-[0.3em] mt-2 text-emerald-600">COMPLETION CERTIFICATE</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10">
                <div className="inline-block p-10 border-4 border-white/10 rounded-lg">
                  <span className="text-6xl font-black text-indigo-400">M-FOUR</span>
                  <p className="text-xl font-bold tracking-[0.3em] mt-2 text-contrast">ESTATES PRIVATE LIMITED</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <p className={`text-xl font-black uppercase ${isFinalReport ? 'text-emerald-400' : 'text-indigo-400'}`}>
                {isFinalReport ? 'AS-BUILT STATUS REPORT' : `Progress Report - ${reportDate}`}
              </p>
              <div className={`h-1.5 w-24 mx-auto ${isFinalReport ? 'bg-emerald-600' : 'bg-indigo-600'}`}></div>
            </div>
            
            <div className="pt-10 grid grid-cols-2 gap-10 text-left font-sans">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client Organization</p>
                <p className="font-bold text-contrast print:text-black">{project.client}</p>
              </div>
              <div className="space-y-2 text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lead PMC Consultant</p>
                <p className="font-bold text-contrast italic print:text-black">Shrikhande Consultants Limited</p>
              </div>
            </div>
          </div>

          {/* Dynamic Sections Based on Report Type */}
          {isFinalReport ? (
            <section className="space-y-10 animate-in fade-in duration-1000">
               <div className="bg-emerald-600/5 border-l-8 border-emerald-600 p-8 rounded-r-2xl">
                 <h2 className="text-2xl font-black uppercase text-emerald-400 mb-4">Executive Closure Summary</h2>
                 <p className="text-sm text-emerald-100/80 leading-relaxed font-sans print:text-black">
                   This document certifies that the <strong>{project.title}</strong> has reached substantial completion on <strong>{project.updatedAt}</strong>. 
                   All structural, electrical, and finishing works have been verified against GFC Drawings and Indian Standard Codes. 
                   Final inspections by PMC and Client representatives are complete, and the asset is ready for handover/operational occupancy.
                 </p>
               </div>

               <div className="space-y-6">
                 <h3 className="text-lg font-black uppercase border-b-2 border-white/10 pb-2 text-contrast print:text-black">Final Financial Reconciliation</h3>
                 <table className="w-full text-left font-sans">
                   <thead>
                     <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                       <th className="p-4">Component</th>
                       <th className="p-4 text-right">Sanctioned</th>
                       <th className="p-4 text-right">Actual Spent</th>
                       <th className="p-4 text-right">Efficiency</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5 text-sm">
                     <tr>
                       <td className="p-4 font-bold text-contrast print:text-black">Civil & Structural</td>
                       <td className="p-4 text-right text-slate-400">{formatINR(project.budget * 0.7)}</td>
                       <td className="p-4 text-right font-bold text-emerald-400">{formatINR(project.budget * 0.68)}</td>
                       <td className="p-4 text-right text-emerald-500 font-black">+2%</td>
                     </tr>
                     <tr>
                       <td className="p-4 font-bold text-contrast print:text-black">Finishing & HVAC</td>
                       <td className="p-4 text-right text-slate-400">{formatINR(project.budget * 0.3)}</td>
                       <td className="p-4 text-right font-bold text-emerald-400">{formatINR(project.budget * 0.29)}</td>
                       <td className="p-4 text-right text-emerald-500 font-black">+1%</td>
                     </tr>
                   </tbody>
                   <tfoot>
                     <tr className="bg-white/10 text-contrast font-black print:bg-slate-100 print:text-black">
                       <td className="p-4">TOTAL CLOSURE VALUE</td>
                       <td className="p-4 text-right">{formatINR(project.budget)}</td>
                       <td className="p-4 text-right">{formatINR(project.budget * 0.97)}</td>
                       <td className="p-4 text-right text-emerald-400">SUCCESS</td>
                     </tr>
                   </tfoot>
                 </table>
               </div>
            </section>
          ) : (
            <>
              {/* Progress Table (only for monthly reports) */}
              <section className="space-y-6">
                <h2 className="text-2xl font-black border-b-2 border-white/10 pb-2 uppercase tracking-tight text-indigo-400 print:text-black">05. PHYSICAL PROGRESS</h2>
                <table className="w-full text-left border-collapse border border-white/10 font-sans print:border-slate-200">
                  <thead>
                    <tr className="bg-white/10 text-contrast print:bg-slate-900 print:text-white">
                      <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">Activity</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center">Progress %</th>
                      <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {project.activities.map((act, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4 font-bold text-contrast print:text-black">{act.description}</td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden print:bg-slate-100">
                              <div 
                                className={`h-full ${((act.cumulativePrevious/act.totalScope)*100) >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                style={{ width: `${Math.min(100, (act.cumulativePrevious/act.totalScope)*100)}%` }}
                              ></div>
                            </div>
                            <span className="font-black text-xs text-contrast print:text-black">{((act.cumulativePrevious/act.totalScope)*100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[10px] font-black uppercase text-slate-500">
                           {((act.cumulativePrevious/act.totalScope)*100) >= 100 ? 'Verified' : 'In Progress'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* Bottlenecks Section */}
              <section className="space-y-6">
                <h2 className="text-2xl font-black border-b-2 border-white/10 pb-2 uppercase tracking-tight text-rose-500 print:text-black">08. BOTTLENECKS & CONSTRAINTS</h2>
                <div className="space-y-4 font-sans">
                  {[
                    'Overall progress delayed due to High Court Petition and Land Litigation.',
                    'Hard rock excavation required in the Eastern part of the site.',
                    'Piles obstructing for raft and retaining wall in phase 1 area.'
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 bg-rose-500/10 border-l-4 border-rose-600 rounded-r-lg">
                      <span className="font-black text-rose-500">{idx + 1}.</span>
                      <p className="text-sm font-bold text-rose-100/80 print:text-black">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Unified Signature Block */}
          <div className="pt-20 grid grid-cols-3 gap-10 text-center font-sans">
            <div className="space-y-12">
              <div className="h-[1px] bg-white/10 w-full print:bg-slate-200"></div>
              <div>
                <p className="text-xs font-black uppercase text-contrast print:text-black">Project Manager</p>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Contractor Signatory</p>
              </div>
            </div>
            <div className="space-y-12">
              <div className="h-[1px] bg-white/10 w-full print:bg-slate-200"></div>
              <div>
                <p className="text-xs font-black uppercase text-contrast print:text-black">PMC Head / Auditor</p>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Shrikhande Consultants</p>
              </div>
            </div>
            <div className="space-y-12">
              <div className="h-[1px] bg-white/10 w-full print:bg-slate-200"></div>
              <div>
                <p className="text-xs font-black uppercase text-contrast print:text-black">Executive Director</p>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Client Signatory</p>
              </div>
            </div>
          </div>

          {/* Page Footer */}
          <div className="text-center pt-10 border-t border-white/10 text-[10px] font-black text-slate-600 uppercase tracking-widest print:border-slate-100 print:text-slate-300">
            {isFinalReport ? 'FINAL PROJECT ASSET RECORD | PMC NEXUS v4.0' : `Page 1 of 31 | Project Nexus ID: ${project.id.toUpperCase()}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
