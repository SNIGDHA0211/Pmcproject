import React, { useState } from 'react';
import type { HSERecord } from '../services/api';
import { findHealthSafetyRecordByPeriod } from '../services/api';
import { ModalPortal } from './ModalPortal';
import { getThemeClasses, useTheme } from '../utils/theme';
import { MONTH_OPTIONS } from '../utils/healthSafety';

export type HealthSafetyFormValues = {
  month: number;
  year: number;
  fatalities: number;
  significant: number;
  major: number;
  minor: number;
  nearMiss: number;
  totalManhours: number;
  lossOfManhours: number;
};

interface HealthSafetyMonthlyFormProps {
  projectName: string;
  record?: HSERecord | null;
  existingRecords?: HSERecord[];
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: HealthSafetyFormValues, record?: HSERecord | null) => Promise<boolean> | boolean;
}

const defaultValues = (): HealthSafetyFormValues => ({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  fatalities: 0,
  significant: 0,
  major: 0,
  minor: 0,
  nearMiss: 0,
  totalManhours: 0,
  lossOfManhours: 0,
});

const HealthSafetyMonthlyForm: React.FC<HealthSafetyMonthlyFormProps> = ({
  projectName,
  record,
  existingRecords = [],
  isSaving,
  error,
  onClose,
  onSubmit,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [values, setValues] = useState<HealthSafetyFormValues>(() =>
    record
      ? {
          month: record.month ?? new Date().getMonth() + 1,
          year: record.year ?? new Date().getFullYear(),
          fatalities: record.fatalities,
          significant: record.significant,
          major: record.major,
          minor: record.minor,
          nearMiss: record.nearMiss,
          totalManhours: record.totalManhours,
          lossOfManhours: record.lossOfManhours,
        }
      : defaultValues()
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const handleNumberChange = (field: keyof HealthSafetyFormValues, raw: string) => {
    const parsed = raw === '' ? 0 : Number(raw);
    setValues((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (values.month < 1 || values.month > 12) {
      setLocalError('Month must be between 1 and 12.');
      return;
    }
    if (!values.year) {
      setLocalError('Year is required.');
      return;
    }
    const negativeField = (Object.entries(values) as [keyof HealthSafetyFormValues, number][])
      .find(([, value]) => typeof value === 'number' && value < 0);
    if (negativeField) {
      setLocalError('Values cannot be negative.');
      return;
    }
    setLocalError(null);
    const existingForPeriod = findHealthSafetyRecordByPeriod(existingRecords, values.month, values.year);
    const recordToSave =
      existingForPeriod ??
      (record?.month === values.month && record?.year === values.year ? record : null);
    const saved = await onSubmit(values, recordToSave);
    if (saved) onClose();
  };

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[100040] flex items-center justify-center bg-black/50 p-4">
        <div className={`w-full max-w-2xl rounded-3xl border p-6 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
                {record?.id ? 'Edit Health & Safety Record' : 'Add Health & Safety Record'}
              </h3>
              <p className={`mt-1 text-[11px] ${themeClasses.textSecondary}`}>{projectName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${isDarkTheme ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
            >
              Close
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Month</label>
                <select
                  value={values.month}
                  onChange={(e) => setValues((prev) => ({ ...prev, month: Number(e.target.value) }))}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`}
                  required
                >
                  {MONTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Year</label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={values.year}
                  onChange={(e) => setValues((prev) => ({ ...prev, year: Number(e.target.value) }))}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.placeholder}`}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ['fatalities', 'Fatalities'],
                ['significant', 'Significant'],
                ['major', 'Major'],
                ['minor', 'Minor'],
                ['nearMiss', 'Near Miss'],
                ['totalManhours', 'Total Manhours'],
              ] as const).map(([field, label]) => (
                <div key={field}>
                  <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={values[field]}
                    onChange={(e) => handleNumberChange(field, e.target.value)}
                    className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.placeholder}`}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>Loss Of Manhours</label>
              <input
                type="number"
                min="0"
                value={values.lossOfManhours}
                onChange={(e) => handleNumberChange('lossOfManhours', e.target.value)}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.placeholder}`}
              />
            </div>

            {(localError || error) && <p className="text-sm font-bold text-rose-500">{localError || error}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 rounded-2xl px-4 py-3 font-bold transition-colors ${isDarkTheme ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default React.memo(HealthSafetyMonthlyForm);
