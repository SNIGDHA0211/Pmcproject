import React, { useState } from 'react';
import type { CorrespondenceMonthlyPeriod } from '../types';
import { ModalPortal } from './ModalPortal';
import { validateCorrespondencePartyCountsInput } from '../utils/correspondence';
import { getThemeClasses, useTheme } from '../utils/theme';

export type CorrespondencePartyCountsFormValues = {
  client_received: number;
  client_delivered: number;
  contractor_received: number;
  contractor_delivered: number;
};

interface CorrespondenceMonthlyFormProps {
  projectName: string;
  period: CorrespondenceMonthlyPeriod;
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: CorrespondencePartyCountsFormValues) => Promise<boolean> | boolean;
}

function periodToForm(period: CorrespondenceMonthlyPeriod): CorrespondencePartyCountsFormValues {
  return {
    client_received: period.client.correspondenceReceived,
    client_delivered: period.client.correspondenceDelivered,
    contractor_received: period.contractor.correspondenceReceived,
    contractor_delivered: period.contractor.correspondenceDelivered,
  };
}

const CorrespondenceMonthlyForm: React.FC<CorrespondenceMonthlyFormProps> = ({
  projectName,
  period,
  isSaving,
  error,
  onClose,
  onSubmit,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [values, setValues] = useState<CorrespondencePartyCountsFormValues>(() => periodToForm(period));
  const [localError, setLocalError] = useState<string | null>(null);

  const handleNumber = (
    field: keyof CorrespondencePartyCountsFormValues,
    raw: string,
  ) => {
    const parsed = raw === '' ? 0 : Number(raw);
    setValues((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    }));
    setLocalError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateCorrespondencePartyCountsInput(values);
    if (validation) {
      setLocalError(validation);
      return;
    }

    const saved = await onSubmit(values);
    if (saved) onClose();
  };

  const sections = [
    {
      title: 'Client',
      fields: [
        { label: 'Received', key: 'client_received' as const },
        { label: 'Delivered', key: 'client_delivered' as const },
      ],
    },
    {
      title: 'Contractor',
      fields: [
        { label: 'Received', key: 'contractor_received' as const },
        { label: 'Delivered', key: 'contractor_delivered' as const },
      ],
    },
  ] as const;

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
        <div className={`w-full max-w-xl rounded-3xl border p-6 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
                Edit Correspondence
              </h3>
              <p className={`mt-1 text-[11px] ${themeClasses.textSecondary}`}>
                {projectName} — pending is calculated by the backend.
              </p>
            </div>
            <button type="button" onClick={onClose} className={`rounded-xl px-3 py-2 text-sm font-bold ${themeClasses.buttonSecondary}`}>
              Close
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {sections.map((section) => (
              <div
                key={section.title}
                className={`rounded-xl border p-3 ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/80'
                  }`}
              >
                <p className={`mb-2 text-sm font-bold ${themeClasses.textPrimary}`}>{section.title}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {section.fields.map((field) => (
                    <div key={field.key}>
                      <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                        {field.label}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={values[field.key]}
                        onChange={(e) => handleNumber(field.key, e.target.value)}
                        className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {(localError || error) && <p className="text-sm font-bold text-rose-500">{localError || error}</p>}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button type="button" onClick={onClose} className={`flex-1 rounded-2xl px-4 py-3 font-bold ${themeClasses.buttonSecondary}`}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save Correspondence'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default React.memo(CorrespondenceMonthlyForm);
