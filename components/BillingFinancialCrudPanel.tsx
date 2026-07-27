import React, { useCallback, useState } from 'react';
import { FileText, HandCoins } from 'lucide-react';
import {
  contractValuesApi,
  getApiErrorMessage,
  invoicingApi,
  normalizeContractValueRecord,
  normalizeInvoicingRecord,
  saveContractValueRecord,
  saveInvoicingRecord,
  unwrapList,
} from '../services/api';
import {
  type ContractValueRecord,
  type ContractValueType,
  getInvoiceTypeLabel,
  type InvoicingRecord,
  type InvoiceType,
} from '../types';
import { ModalPortal } from './ModalPortal';
import BillingSection from './billing/BillingSection';
import { getBillingTheme } from '../utils/billingDashboardTheme';
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
  cosExtraItem: 0,
});

interface BillingFinancialCrudPanelProps {
  projectName: string;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

type ModalKind = 'invoicing' | 'contract_value' | null;

const BillingFinancialCrudPanel: React.FC<BillingFinancialCrudPanelProps> = ({ projectName, onToast }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const billing = getBillingTheme(isDarkTheme, themeClasses);

  const [loading, setLoading] = useState(false);
  const [invoicing, setInvoicing] = useState<Record<InvoiceType, InvoicingRecord | null>>({ PMC: null, Contractor: null });
  const [contractValues, setContractValues] = useState<Record<ContractValueType, ContractValueRecord | null>>({ SCL: null, Contractor: null });

  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<InvoicingRecord | null>(null);
  const [contractValueForm, setContractValueForm] = useState<ContractValueRecord | null>(null);

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
        cosExtraItem: contractValueForm.cosExtraItem ?? 0,
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
      <BillingSection icon={<FileText size={20} />} title="Invoicing & Contract Values" subtitle={projectName}>
        <div className="flex min-h-[160px] items-center justify-center">
          <div className={billing.spinner} />
        </div>
      </BillingSection>
    );
  }

  return (
    <BillingSection
      icon={<HandCoins size={20} />}
      title="Invoicing & Contract Values"
      subtitle={projectName}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={billing.innerCard}>
          <div className="mb-3 flex items-center gap-2">
            <FileText size={16} className="text-indigo-500" />
            <h4 className={billing.sectionTitle}>Invoicing</h4>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {INVOICE_TYPES.map((type) => {
              const rec = invoicing[type];
              return (
                <div key={type} className={`rounded-xl border p-3 ${isDarkTheme ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-white'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className={`text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>{getInvoiceTypeLabel(type)}</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openInvoicing(type)}
                        className={billing.btnPrimarySm}
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

        <div className={billing.innerCard}>
          <div className="mb-3 flex items-center gap-2">
            <HandCoins size={16} className="text-indigo-500" />
            <h4 className={billing.sectionTitle}>Contract Values</h4>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CONTRACT_TYPES.map((type) => {
              const rec = contractValues[type];
              return (
                <div key={type} className={`rounded-xl border p-3 ${isDarkTheme ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-white'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className={`text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>{type}</p>
                    <button
                      type="button"
                      onClick={() => openContractValue(type)}
                      className={billing.btnPrimarySm}
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
                      <button type="button" onClick={closeModal} className={billing.btnSecondary}>Cancel</button>
                      <button type="submit" disabled={saving} className={billing.btnSave}>{saving ? 'Saving…' : 'Save'}</button>
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
                      ['approvedVO', 'Excess Value'],
                      ['cosExtraItem', 'COS Extra Item'],
                      ['potentialPendingVO', 'Saving'],
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <label className={`mb-1 block text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>{label}</label>
                        <input type="number" min={0} value={contractValueForm[key]} onChange={(e) => setContractValueForm((p) => p && ({ ...p, [key]: Number(e.target.value) || 0 }))} className={`w-full rounded-xl border px-3 py-2 text-sm ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`} />
                      </div>
                    ))}
                    {formError && <p className="text-xs text-rose-500">{formError}</p>}
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={closeModal} className={billing.btnSecondary}>Cancel</button>
                      <button type="submit" disabled={saving} className={billing.btnSave}>{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </BillingSection>
  );
};

export default BillingFinancialCrudPanel;
