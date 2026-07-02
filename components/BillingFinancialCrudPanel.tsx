import React, { useCallback, useState } from 'react';
import { FileText, HandCoins } from 'lucide-react';
import {
  contractPerformanceApi,
  contractValuesApi,
  getApiErrorMessage,
  invoicingApi,
  normalizeContractPerformanceRecord,
  normalizeContractValueRecord,
  normalizeInvoicingRecord,
  saveContractPerformanceRecord,
  saveContractValueRecord,
  saveInvoicingRecord,
  unwrapList,
} from '../services/api';
import {
  type ContractPerformanceRecord,
  type ContractValueRecord,
  type ContractValueType,
  getInvoiceTypeLabel,
  type InvoicingRecord,
  type InvoiceType,
} from '../types';
import { ModalPortal } from './ModalPortal';
import { getThemeClasses, useTheme } from '../utils/theme';

const INVOICE_TYPES: InvoiceType[] = ['PMC', 'Contractor'];
const CONTRACT_TYPES: ContractValueType[] = ['SCL', 'Contractor'];

const emptyInvoicing = (projectName: string, invoiceType: InvoiceType): InvoicingRecord => ({
  projectName,
  invoiceType,
  grossBilled: 0,
  netBilledWithoutVAT: 0,
  netCollected: 0,
});

const emptyContractValue = (projectName: string, contractType: ContractValueType): ContractValueRecord => ({
  projectName,
  contractType,
  originalContractValue: 0,
  approvedVO: 0,
  revisedContractValue: 0,
  potentialPendingVO: 0,
});

interface BillingFinancialCrudPanelProps {
  projectName: string;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

type ModalKind = 'invoicing' | 'contract_value' | 'contract_performance' | null;

const BillingFinancialCrudPanel: React.FC<BillingFinancialCrudPanelProps> = ({ projectName, onToast }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [loading, setLoading] = useState(false);
  const [invoicing, setInvoicing] = useState<Record<InvoiceType, InvoicingRecord | null>>({ PMC: null, Contractor: null });
  const [contractValues, setContractValues] = useState<Record<ContractValueType, ContractValueRecord | null>>({ SCL: null, Contractor: null });
  const [contractPerformance, setContractPerformance] = useState<ContractPerformanceRecord | null>(null);

  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<InvoicingRecord | null>(null);
  const [contractValueForm, setContractValueForm] = useState<ContractValueRecord | null>(null);
  const [performanceForm, setPerformanceForm] = useState({ billedValue: 0, actualReceiptValue: 0 });

  const cardCls = `rounded-2xl border p-4 sm:p-5 ${
    isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm'
  }`;

  const loadFinancial = useCallback(async () => {
    if (!projectName) return;
    setLoading(true);
    try {
      const nextInvoicing: Record<InvoiceType, InvoicingRecord | null> = { PMC: null, Contractor: null };
      await Promise.all(
        INVOICE_TYPES.map(async (type) => {
          try {
            const res = await invoicingApi.getInvoicing({ projectName, invoiceType: type });
            const row = unwrapList(res.data)[0];
            nextInvoicing[type] = row ? normalizeInvoicingRecord(row, projectName, type) : null;
          } catch {
            nextInvoicing[type] = null;
          }
        }),
      );
      setInvoicing(nextInvoicing);

      const nextCv: Record<ContractValueType, ContractValueRecord | null> = { SCL: null, Contractor: null };
      await Promise.all(
        CONTRACT_TYPES.map(async (type) => {
          try {
            const res = await contractValuesApi.getContractValues({ projectName, contractType: type });
            const row = unwrapList(res.data)[0];
            nextCv[type] = row ? normalizeContractValueRecord(row, projectName, type) : null;
          } catch {
            nextCv[type] = null;
          }
        }),
      );
      setContractValues(nextCv);

      try {
        const cpRes = await contractPerformanceApi.getContractPerformance({ project_name: projectName });
        const cpRow = unwrapList(cpRes.data)[0];
        setContractPerformance(cpRow ? normalizeContractPerformanceRecord(cpRow) : null);
      } catch {
        setContractPerformance(null);
      }
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  React.useEffect(() => {
    void loadFinancial();
  }, [loadFinancial]);

  const formatInr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

  const openInvoicing = (type: InvoiceType) => {
    setInvoiceForm(invoicing[type] ?? emptyInvoicing(projectName, type));
    setFormError(null);
    setModalKind('invoicing');
  };

  const openContractValue = (type: ContractValueType) => {
    setContractValueForm(contractValues[type] ?? emptyContractValue(projectName, type));
    setFormError(null);
    setModalKind('contract_value');
  };

  const openPerformance = () => {
    setPerformanceForm({
      billedValue: contractPerformance?.billedValue ?? 0,
      actualReceiptValue: contractPerformance?.actualReceiptValue ?? 0,
    });
    setFormError(null);
    setModalKind('contract_performance');
  };

  const closeModal = () => {
    if (!saving) setModalKind(null);
  };

  const saveInvoicing = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invoiceForm) return;
    setSaving(true);
    setFormError(null);
    try {
      await saveInvoicingRecord(
        {
          projectName,
          invoiceType: invoiceForm.invoiceType,
          grossBilled: invoiceForm.grossBilled,
          netBilledWithoutVAT: invoiceForm.netBilledWithoutVAT,
        },
        invoiceForm.id,
      );
      onToast('Invoicing record saved.');
      setModalKind(null);
      await loadFinancial();
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Failed to save invoicing record.'));
    } finally {
      setSaving(false);
    }
  };

  const saveContractValue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contractValueForm) return;
    setSaving(true);
    setFormError(null);
    try {
      await saveContractValueRecord({
        projectName,
        contractType: contractValueForm.contractType,
        originalContractValue: contractValueForm.originalContractValue,
        approvedVO: contractValueForm.approvedVO,
        potentialPendingVO: contractValueForm.potentialPendingVO,
      });
      onToast('Contract value saved.');
      setModalKind(null);
      await loadFinancial();
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Failed to save contract value.'));
    } finally {
      setSaving(false);
    }
  };

  const savePerformance = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await saveContractPerformanceRecord(
        {
          project_name: projectName,
          billedValue: performanceForm.billedValue,
          actualReceiptValue: performanceForm.actualReceiptValue,
        },
        contractPerformance?.id,
      );
      onToast('Contract performance saved.');
      setModalKind(null);
      await loadFinancial();
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Failed to save contract performance.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteInvoicing = async (type: InvoiceType) => {
    const rec = invoicing[type];
    if (!rec?.id) return;
    if (!window.confirm(`Delete ${getInvoiceTypeLabel(type)} invoicing record?`)) return;
    try {
      await invoicingApi.deleteInvoicing(rec.id);
      onToast('Invoicing record deleted.');
      await loadFinancial();
    } catch (error) {
      onToast(getApiErrorMessage(error, 'Failed to delete invoicing record.'), 'error');
    }
  };

  if (loading && !invoicing.PMC && !contractValues.SCL) {
    return (
      <div className={`flex min-h-[160px] items-center justify-center ${cardCls}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardCls}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-indigo-500" />
              <h3 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Invoicing</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {INVOICE_TYPES.map((type) => {
              const rec = invoicing[type];
              return (
                <div key={type} className={`rounded-xl border p-3 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className={`text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>{getInvoiceTypeLabel(type)}</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openInvoicing(type)}
                        className="rounded-lg bg-indigo-600 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white hover:bg-indigo-500"
                      >
                        {rec ? 'Update' : 'Add'}
                      </button>
                      {rec?.id && (
                        <button type="button" onClick={() => void deleteInvoicing(type)} className="rounded-lg border border-rose-200 px-2 py-1 text-[9px] font-black uppercase text-rose-600 hover:bg-rose-50">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {rec ? (
                    <div className="space-y-1 text-xs">
                      <p className={themeClasses.textSecondary}>Gross Billed: <span className={`font-bold ${themeClasses.textPrimary}`}>{formatInr(rec.grossBilled)}</span></p>
                      <p className={themeClasses.textSecondary}>Certified: <span className={`font-bold ${themeClasses.textPrimary}`}>{formatInr(rec.netBilledWithoutVAT)}</span></p>
                      <p className={themeClasses.textSecondary}>Efficiency: <span className="font-bold text-emerald-500">{(rec.collectionPercentage ?? 0).toFixed(1)}%</span></p>
                    </div>
                  ) : (
                    <button type="button" onClick={() => openInvoicing(type)} className="text-[10px] font-bold uppercase text-indigo-500 hover:underline">Add record</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={cardCls}>
          <div className="mb-3 flex items-center gap-2">
            <HandCoins size={18} className="text-emerald-500" />
            <h3 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Contract Values</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CONTRACT_TYPES.map((type) => {
              const rec = contractValues[type];
              return (
                <div key={type} className={`rounded-xl border p-3 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className={`text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>{type}</p>
                    <button
                      type="button"
                      onClick={() => openContractValue(type)}
                      className="rounded-lg bg-indigo-600 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white hover:bg-indigo-500"
                    >
                      {rec ? 'Update' : 'Add'}
                    </button>
                  </div>
                  {rec ? (
                    <div className="space-y-1 text-xs">
                      <p className={themeClasses.textSecondary}>Original: <span className={`font-bold ${themeClasses.textPrimary}`}>{formatInr(rec.originalContractValue)}</span></p>
                      <p className={themeClasses.textSecondary}>Revised: <span className={`font-bold ${themeClasses.textPrimary}`}>{formatInr(rec.revisedContractValue)}</span></p>
                      <p className={themeClasses.textSecondary}>Approved VO: <span className="font-bold text-amber-500">{formatInr(rec.approvedVO)}</span></p>
                    </div>
                  ) : (
                    <button type="button" onClick={() => openContractValue(type)} className="text-[10px] font-bold uppercase text-indigo-500 hover:underline">Add record</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={cardCls}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Contract Performance</h3>
          <button type="button" onClick={openPerformance} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black uppercase text-white hover:bg-indigo-500">
            {contractPerformance ? 'Update Performance' : 'Add Performance'}
          </button>
        </div>
        {contractPerformance ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Billed Value', value: formatInr(contractPerformance.billedValue) },
              { label: 'Receipt Value', value: formatInr(contractPerformance.actualReceiptValue) },
              { label: 'Variance', value: formatInr(contractPerformance.variance) },
              { label: 'Performance', value: `${contractPerformance.performancePercentage.toFixed(1)}%` },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl border px-3 py-2.5 text-center ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                <p className={`text-[9px] font-bold uppercase ${themeClasses.textSecondary}`}>{item.label}</p>
                <p className={`mt-1 text-base font-black tabular-nums ${themeClasses.textPrimary}`}>{item.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-center text-sm ${themeClasses.textSecondary}`}>No contract performance data yet.</p>
        )}
      </div>

      {modalKind && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[100040] flex items-center justify-center bg-black/50 p-4">
            <div className={`max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5 shadow-2xl ${themeClasses.glassCard} ${themeClasses.border}`}>
              {modalKind === 'invoicing' && invoiceForm && (
                <>
                  <h4 className={`mb-4 font-black uppercase ${themeClasses.textPrimary}`}>Edit {getInvoiceTypeLabel(invoiceForm.invoiceType)} Invoicing</h4>
                  <form onSubmit={saveInvoicing} className="space-y-3">
                    {([
                      ['grossBilled', 'Gross Billed'],
                      ['netBilledWithoutVAT', 'Gross Certified Billed'],
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>{label}</label>
                        <input type="number" min={0} value={invoiceForm[key]} onChange={(e) => setInvoiceForm((p) => p && ({ ...p, [key]: Number(e.target.value) || 0 }))} className={`w-full rounded-xl border px-3 py-2 text-sm ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`} />
                      </div>
                    ))}
                    {formError && <p className="text-xs text-rose-500">{formError}</p>}
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={closeModal} className={`rounded-xl border px-4 py-2 text-xs font-bold ${themeClasses.buttonSecondary}`}>Cancel</button>
                      <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                  </form>
                </>
              )}
              {modalKind === 'contract_value' && contractValueForm && (
                <>
                  <h4 className={`mb-4 font-black uppercase ${themeClasses.textPrimary}`}>Edit {contractValueForm.contractType} Contract Value</h4>
                  <form onSubmit={saveContractValue} className="space-y-3">
                    {([
                      ['originalContractValue', 'Original Contract Value'],
                      ['approvedVO', 'Approved VO'],
                      ['potentialPendingVO', 'Potential Pending VO'],
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>{label}</label>
                        <input type="number" min={0} value={contractValueForm[key]} onChange={(e) => setContractValueForm((p) => p && ({ ...p, [key]: Number(e.target.value) || 0 }))} className={`w-full rounded-xl border px-3 py-2 text-sm ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`} />
                      </div>
                    ))}
                    {formError && <p className="text-xs text-rose-500">{formError}</p>}
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={closeModal} className={`rounded-xl border px-4 py-2 text-xs font-bold ${themeClasses.buttonSecondary}`}>Cancel</button>
                      <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                  </form>
                </>
              )}
              {modalKind === 'contract_performance' && (
                <>
                  <h4 className={`mb-4 font-black uppercase ${themeClasses.textPrimary}`}>Contract Performance</h4>
                  <form onSubmit={savePerformance} className="space-y-3">
                    <div>
                      <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>Billed Value</label>
                      <input type="number" min={0} value={performanceForm.billedValue} onChange={(e) => setPerformanceForm((p) => ({ ...p, billedValue: Number(e.target.value) || 0 }))} className={`w-full rounded-xl border px-3 py-2 text-sm ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`} />
                    </div>
                    <div>
                      <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>Actual Receipt Value</label>
                      <input type="number" min={0} value={performanceForm.actualReceiptValue} onChange={(e) => setPerformanceForm((p) => ({ ...p, actualReceiptValue: Number(e.target.value) || 0 }))} className={`w-full rounded-xl border px-3 py-2 text-sm ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`} />
                    </div>
                    {formError && <p className="text-xs text-rose-500">{formError}</p>}
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={closeModal} className={`rounded-xl border px-4 py-2 text-xs font-bold ${themeClasses.buttonSecondary}`}>Cancel</button>
                      <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default BillingFinancialCrudPanel;
