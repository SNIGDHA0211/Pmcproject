import React, { useMemo, useState } from 'react';
import type { ProjectQualityStatusRecord } from '../types';
import { findQualityRecordByPeriod } from '../services/api';
import { ModalPortal } from './ModalPortal';
import { MONTH_OPTIONS, computeTestsFailed, validateQualityFormInput } from '../utils/qualityStatus';
import { getThemeClasses, useTheme } from '../utils/theme';

export type QualityFormValues = {
  month: number;
  year: number;
  testsRequired: number;
  testsConducted: number;
  testsPassed: number;
  testsFailed: number;
};

type QualityFormEditable = Omit<QualityFormValues, 'testsFailed'>;

interface QualityMonthlyFormProps {
  projectName: string;
  record?: ProjectQualityStatusRecord | null;
  existingRecords?: ProjectQualityStatusRecord[];
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: QualityFormValues, record?: ProjectQualityStatusRecord | null) => Promise<boolean> | boolean;
}

const defaultValues = (): QualityFormEditable => ({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  testsRequired: 0,
  testsConducted: 0,
  testsPassed: 0,
});

const QualityMonthlyForm: React.FC<QualityMonthlyFormProps> = ({
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
  const [values, setValues] = useState<QualityFormEditable>(() =>
    record
      ? {
          month: record.month,
          year: record.year,
          testsRequired: record.testsRequired,
          testsConducted: record.testsConducted,
          testsPassed: record.testsPassed,
        }
      : defaultValues()
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const testsFailed = useMemo(
    () => computeTestsFailed(values.testsConducted, values.testsPassed),
    [values.testsConducted, values.testsPassed]
  );

  const handleNumberChange = (field: keyof QualityFormEditable, raw: string) => {
    const parsed = raw === '' ? 0 : Number(raw);
    setValues((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    }));
    setLocalError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (values.month < 1 || values.month > 12) {
      setLocalError('Month must be between 1 and 12.');
      return;
    }
    const validationMessage = validateQualityFormInput(values);
    if (validationMessage && !validationMessage.startsWith('Warning:')) {
      setLocalError(validationMessage);
      return;
    }

    const existingForPeriod = findQualityRecordByPeriod(existingRecords, values.month, values.year);
    const recordToSave =
      existingForPeriod ??
      (record?.month === values.month && record?.year === values.year ? record : null);

    const saved = await onSubmit({ ...values, testsFailed }, recordToSave);
    if (saved) onClose();
  };

  const warningOnly = validateQualityFormInput(values)?.startsWith('Warning:')
    ? validateQualityFormInput(values)
    : null;

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
        <div className={`w-full max-w-xl rounded-3xl border p-6 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
                Edit Project Quality Status
              </h3>
              <p className={`mt-1 text-[11px] ${themeClasses.textSecondary}`}>
                {projectName} — shortfall, tests failed, and quality performance are calculated automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                isDarkTheme ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              Close
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Month
                </label>
                <select
                  value={values.month}
                  onChange={(e) => handleNumberChange('month', e.target.value)}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`}
                >
                  {MONTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Year
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={values.year}
                  onChange={(e) => handleNumberChange('year', e.target.value)}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(
                [
                  ['testsRequired', 'Tests Required'],
                  ['testsConducted', 'Tests Conducted'],
                  ['testsPassed', 'Tests Passed'],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    {label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={values[field]}
                    onChange={(e) => handleNumberChange(field, e.target.value)}
                    className={`w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`}
                  />
                </div>
              ))}
              <div>
                <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Tests Failed
                </label>
                <input
                  type="number"
                  readOnly
                  tabIndex={-1}
                  value={testsFailed}
                  className={`w-full cursor-not-allowed rounded-2xl px-4 py-3 text-sm font-bold outline-none opacity-90 ${
                    isDarkTheme ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                  aria-label="Tests failed (auto-calculated)"
                />
                <p className={`mt-1 text-[9px] font-bold ${themeClasses.textMuted}`}>
                  Conducted − Passed
                </p>
              </div>
            </div>

            {warningOnly && <p className="text-[11px] font-bold text-amber-500">{warningOnly}</p>}
            {(localError || error) && <p className="text-sm font-bold text-rose-500">{localError || error}</p>}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 rounded-2xl px-4 py-3 font-bold transition-colors ${
                  isDarkTheme ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save Quality Status'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default React.memo(QualityMonthlyForm);
