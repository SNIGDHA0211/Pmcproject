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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAddContractorForm(form: typeof emptyForm): Record<string, string> {
  const next: Record<string, string> = {};
  if (!form.contractor_name.trim()) {
    next.contractor_name = 'Contractor name is required.';
  }
  if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
    next.email = 'Enter a valid email address.';
  }
  if (form.phone.trim() && form.phone.replace(/\D/g, '').length < 7) {
    next.phone = 'Enter a valid phone number.';
  }
  return next;
}

const AddContractorModal: React.FC<AddContractorModalProps> = ({
  open,
  projectName,
  onClose,
  onCreated,
}) => {
  const theme = useCmTheme();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setError(null);
    setFieldErrors({});
    setIsSaving(false);
  }, [open]);

  const inputClass = (hasError?: boolean) =>
    `${theme.select.input} ${hasError ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`;

  const updateField = (key: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateAddContractorForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError([...new Set(Object.values(nextErrors))].join(' '));
      return;
    }

    const name = form.contractor_name.trim();
    setIsSaving(true);
    setError(null);
    setFieldErrors({});
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

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className={theme.select.label}>
                Contractor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.contractor_name}
                onChange={(e) => updateField('contractor_name', e.target.value)}
                autoFocus
                placeholder="e.g. ABC Infra Pvt Ltd"
                className={inputClass(Boolean(fieldErrors.contractor_name))}
              />
              {fieldErrors.contractor_name && (
                <p className="mt-1 text-xs font-semibold text-rose-500">{fieldErrors.contractor_name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(['contractor_code', 'contact_person'] as const).map((field) => (
                <div key={field}>
                  <label className={theme.select.label}>
                    {field === 'contractor_code' ? 'Contractor Code' : 'Contact Person'}
                    <span className={`ml-1 font-semibold normal-case tracking-normal ${theme.tc.textMuted}`}>
                      Optional
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    placeholder="Optional"
                    className={inputClass()}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={theme.select.label}>
                  Phone
                  <span className={`ml-1 font-semibold normal-case tracking-normal ${theme.tc.textMuted}`}>
                    Optional
                  </span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="Optional"
                  className={inputClass(Boolean(fieldErrors.phone))}
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs font-semibold text-rose-500">{fieldErrors.phone}</p>
                )}
              </div>
              <div>
                <label className={theme.select.label}>
                  Email
                  <span className={`ml-1 font-semibold normal-case tracking-normal ${theme.tc.textMuted}`}>
                    Optional
                  </span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="Optional"
                  className={inputClass(Boolean(fieldErrors.email))}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs font-semibold text-rose-500">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label className={theme.select.label}>
                Address
                <span className={`ml-1 font-semibold normal-case tracking-normal ${theme.tc.textMuted}`}>
                  Optional
                </span>
              </label>
              <textarea
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                rows={2}
                placeholder="Optional"
                className={`${inputClass()} resize-none`}
              />
            </div>

            {error && (
              <p role="alert" className={theme.errorBanner}>
                {error}
              </p>
            )}

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
