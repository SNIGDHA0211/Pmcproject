import React, { useEffect, useState } from 'react';
import { HardHat, X } from 'lucide-react';
import { ModalPortal } from '../ModalPortal';
import { contractorMasterApi, getApiErrorMessage } from '../../services/contractorManagementApi';
import type { ContractorMasterRecord } from '../../types/contractorManagement';
import { useCmTheme } from './enterpriseTheme';
import CmButton from './ui/CmButton';

interface AddContractorModalProps {
  open: boolean;
  projectName: string;
  onClose: () => void;
  onCreated: (record: ContractorMasterRecord) => void;
}

const emptyForm = {
  contractor_name: '',
  contractor_code: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
};

const AddContractorModal: React.FC<AddContractorModalProps> = ({
  open,
  projectName,
  onClose,
  onCreated,
}) => {
  const theme = useCmTheme();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setError(null);
    setIsSaving(false);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.contractor_name.trim();
    if (!name) {
      setError('Contractor name is required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const created = await contractorMasterApi.create(projectName, {
        contractor_name: name,
        ...(form.contractor_code.trim() ? { contractor_code: form.contractor_code.trim() } : {}),
        ...(form.contact_person.trim() ? { contact_person: form.contact_person.trim() } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
      });
      if (!created) {
        setError('Contractor was created but the response could not be read. Please refresh.');
        return;
      }
      onCreated(created);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to add contractor.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  const inputClass = theme.select.input;

  return (
    <ModalPortal open={open}>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div
          className={`w-full max-w-lg ${theme.panel} p-5 shadow-2xl sm:p-6`}
          role="dialog"
          aria-labelledby="add-contractor-title"
          aria-modal="true"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className={theme.infoIcon}>
                <HardHat size={20} />
              </span>
              <div>
                <h3 id="add-contractor-title" className={`text-lg font-black ${theme.tc.textPrimary}`}>
                  Add Contractor
                </h3>
                <p className={`mt-0.5 text-xs ${theme.tc.textMuted}`}>
                  Creates a contractor in Contractor Master for{' '}
                  <span className={`font-semibold ${theme.tc.textPrimary}`}>{projectName}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`rounded-xl p-2 transition-colors ${theme.tc.textMuted} ${theme.tc.bgHover}`}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={theme.select.label}>
                Contractor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.contractor_name}
                onChange={(e) => setForm((prev) => ({ ...prev, contractor_name: e.target.value }))}
                required
                autoFocus
                placeholder="e.g. ABC Infra Pvt Ltd"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(['contractor_code', 'contact_person'] as const).map((field) => (
                <div key={field}>
                  <label className={theme.select.label}>
                    {field === 'contractor_code' ? 'Contractor Code' : 'Contact Person'}
                  </label>
                  <input
                    type="text"
                    value={form[field]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={theme.select.label}>Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={theme.select.label}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={theme.select.label}>Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                rows={2}
                placeholder="Optional"
                className={`${inputClass} resize-none`}
              />
            </div>

            {error && <p className={theme.errorBanner}>{error}</p>}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <CmButton variant="secondary" onClick={onClose} disabled={isSaving} className="flex-1">
                Cancel
              </CmButton>
              <CmButton type="submit" variant="primary" loading={isSaving} disabled={isSaving} className="flex-1">
                {isSaving ? 'Adding…' : 'Add Contractor'}
              </CmButton>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AddContractorModal;
