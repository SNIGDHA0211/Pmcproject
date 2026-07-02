
import React from 'react';
import { Icons } from './Icons';

interface TermsAndConditionsProps {
  onClose: () => void;
}

const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-10">
      <div className="bg-slate-900 w-full max-w-4xl h-full max-h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-contrast">
              <Icons.Safety size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-contrast uppercase tracking-tight">Legal & Compliance</h2>
              <p className="text-[10px] font-bold muted uppercase tracking-widest">Standard Terms of Operations // Version 4.2.0</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 text-white/40 hover:text-rose-500 rounded-2xl transition-all shadow-sm">
            <Icons.Reject size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 font-sans leading-relaxed text-contrast/70">
          
          <section className="space-y-4">
            <h3 className="text-lg font-black text-contrast uppercase tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">01</span>
              Acceptance of Digital Governance
            </h3>
            <p className="text-sm font-medium">
              By accessing the PMC Portal, users acknowledge that they are operating within a high-security enterprise environment. All actions, including project initiations, DPR submissions, and document uploads, are cryptographically logged and bound by the <span className="text-indigo-400 font-bold">Indian Information Technology Act, 2000</span> and subsequent amendments.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-black text-contrast uppercase tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">02</span>
              Intellectual Property & Site Data
            </h3>
            <p className="text-sm font-medium">
              All architectural drawings, GFC (Good for Construction) files, structural audit reports, and proprietary site data stored in the <span className="italic">Vault</span> remain the exclusive intellectual property of the Client and Lead PMC Consultant. Unauthorized replication or external transmission of these artifacts is strictly prohibited and subject to legal prosecution.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-black text-contrast uppercase tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">03</span>
              Daily Progress Reporting (DPR) Integrity
            </h3>
            <p className="text-sm font-medium">
              Site Engineers are legally bound to submit accurate, real-time data regarding manpower deployment and physical activity progress. Falsification of resource counts or completion percentages constitutes a breach of contract and will result in immediate system suspension and notification to the PMC Head.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-black text-contrast uppercase tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">04</span>
              HSE & Safety Compliance Monitoring
            </h3>
            <p className="text-sm font-medium">
              The Portal acts as a primary record for Health, Safety, and Environment (HSE) statistics. Significant accidents, fatalities, or near-misses must be logged within 2 hours of occurrence. Failure to report safety incidents via the digital workflow may result in site shutdown orders.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-black text-contrast uppercase tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">05</span>
              Audit Trails & Verification
            </h3>
            <p className="text-sm font-medium">
              The <span className="font-bold">Immutable Audit Ledger</span> tracks every status change from "CREATED" to "APPROVED". These records are acceptable as primary evidence for financial reconciliation, billing disputes, and judicial proceedings relating to project execution delays.
            </p>
          </section>

          <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 text-contrast">
            <div className="flex items-start gap-4">
              <Icons.Issue className="text-amber-400 mt-1" size={24} />
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-2">Notice of Confidentiality</h4>
                <p className="text-xs text-contrast/60 font-medium leading-relaxed">
                  The information contained in generated reports (Monthly/Final) is intended solely for the use of the individual or entity to whom they are addressed. If you have received a report in error, please notify the Project Manager immediately.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <p className="text-[10px] font-black muted uppercase tracking-widest">
            Last Updated: Jan 2025 // Nexus PMC Solutions
          </p>
          <button 
            onClick={onClose}
            className="px-12 py-4 bg-indigo-600 text-contrast font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
          >
            Acknowledge Terms
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
