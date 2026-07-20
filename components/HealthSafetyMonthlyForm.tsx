import React, { useMemo, useState } from 'react';
import type { HealthSafetyCreatePayload, HSERecord } from '../services/api';
import { findHealthSafetyRecordByPeriod } from '../services/api';
import { ModalPortal } from './ModalPortal';
import { getThemeClasses, useTheme } from '../utils/theme';
import { MONTH_OPTIONS } from '../utils/healthSafety';

export type HealthSafetyFormValues = {
  month: number;
  year: number;
  averageDailyManpower: number;
  workingDays: number;
  fatalities: number;
  significant: number;
  major: number;
  minor: number;
  nearMiss: number;
  reportableAccidentLti: number;
  dangerousOccurrences: number;
  firstAidCases: number;
  medicalTreatmentCases: number;
  utilityDamage: number;
  lossOfManhours: number;
  internalTrainingCount: number;
  internalTrainingHours: number;
  externalTrainingCount: number;
  externalTrainingHours: number;
  mockDrills: number;
  medicalCheckupWorkers: number;
  medicalCheckupStaff: number;
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

export const defaultHealthSafetyFormValues = (): HealthSafetyFormValues => ({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  averageDailyManpower: 0,
  workingDays: 26,
  fatalities: 0,
  significant: 0,
  major: 0,
  minor: 0,
  nearMiss: 0,
  reportableAccidentLti: 0,
  dangerousOccurrences: 0,
  firstAidCases: 0,
  medicalTreatmentCases: 0,
  utilityDamage: 0,
  lossOfManhours: 0,
  internalTrainingCount: 0,
  internalTrainingHours: 0,
  externalTrainingCount: 0,
  externalTrainingHours: 0,
  mockDrills: 0,
  medicalCheckupWorkers: 0,
  medicalCheckupStaff: 0,
});

export function healthSafetyFormFromRecord(record: HSERecord): HealthSafetyFormValues {
  return {
    month: record.month ?? new Date().getMonth() + 1,
    year: record.year ?? new Date().getFullYear(),
    averageDailyManpower: record.averageDailyManpower ?? 0,
    workingDays: record.workingDays > 0 ? record.workingDays : 26,
    fatalities: record.fatalities,
    significant: record.significant,
    major: record.major,
    minor: record.minor,
    nearMiss: record.nearMiss,
    reportableAccidentLti: record.reportableAccidentLti ?? 0,
    dangerousOccurrences: record.dangerousOccurrences ?? 0,
    firstAidCases: record.firstAidCases ?? 0,
    medicalTreatmentCases: record.medicalTreatmentCases ?? 0,
    utilityDamage: record.utilityDamage ?? 0,
    lossOfManhours: record.lossOfManhours,
    internalTrainingCount: record.internalTrainingCount ?? 0,
    internalTrainingHours: record.internalTrainingHours ?? 0,
    externalTrainingCount: record.externalTrainingCount ?? 0,
    externalTrainingHours: record.externalTrainingHours ?? 0,
    mockDrills: record.mockDrills ?? 0,
    medicalCheckupWorkers: record.medicalCheckupWorkers ?? 0,
    medicalCheckupStaff: record.medicalCheckupStaff ?? 0,
  };
}

/** Build POST upsert payload — never includes auto-calculated fields. */
export function healthSafetyPayloadFromForm(
  projectName: string,
  values: HealthSafetyFormValues,
): HealthSafetyCreatePayload {
  return {
    projectName,
    month: values.month,
    year: values.year,
    averageDailyManpower: values.averageDailyManpower,
    workingDays: values.workingDays,
    fatalities: values.fatalities,
    significant: values.significant,
    major: values.major,
    minor: values.minor,
    nearMiss: values.nearMiss,
    reportableAccidentLti: values.reportableAccidentLti,
    dangerousOccurrences: values.dangerousOccurrences,
    firstAidCases: values.firstAidCases,
    medicalTreatmentCases: values.medicalTreatmentCases,
    utilityDamage: values.utilityDamage,
    lossOfManhours: values.lossOfManhours,
    internalTrainingCount: values.internalTrainingCount,
    internalTrainingHours: values.internalTrainingHours,
    externalTrainingCount: values.externalTrainingCount,
    externalTrainingHours: values.externalTrainingHours,
    mockDrills: values.mockDrills,
    medicalCheckupWorkers: values.medicalCheckupWorkers,
    medicalCheckupStaff: values.medicalCheckupStaff,
  };
}

type NumberField = Exclude<keyof HealthSafetyFormValues, never>;

const FieldInput: React.FC<{
  label: string;
  field: NumberField;
  values: HealthSafetyFormValues;
  onChange: (field: NumberField, raw: string) => void;
  themeClasses: ReturnType<typeof getThemeClasses>;
  step?: string;
}> = ({ label, field, values, onChange, themeClasses, step = '1' }) => (
  <div>
    <label className={`mb-0.5 block text-[9px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>
      {label}
    </label>
    <input
      type="number"
      min="0"
      step={step}
      value={values[field]}
      onChange={(e) => onChange(field, e.target.value)}
      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none ${themeClasses.input} ${themeClasses.placeholder}`}
    />
  </div>
);

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
    record ? healthSafetyFormFromRecord(record) : defaultHealthSafetyFormValues(),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const manDays = values.averageDailyManpower * values.workingDays;
    const manHours = manDays * 8;
    const medicalTotal = values.medicalCheckupWorkers + values.medicalCheckupStaff;
    return { manDays, manHours, medicalTotal };
  }, [values.averageDailyManpower, values.workingDays, values.medicalCheckupWorkers, values.medicalCheckupStaff]);

  const handleNumberChange = (field: NumberField, raw: string) => {
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
    const negativeField = (Object.entries(values) as [NumberField, number][]).find(
      ([, value]) => typeof value === 'number' && value < 0,
    );
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

  const sectionClass = `rounded-xl border p-2.5 ${
    isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
  }`;
  const sectionTitle = (tone: string, label: string) => (
    <p className={`mb-2 text-[9px] font-bold uppercase tracking-wide ${tone}`}>{label}</p>
  );

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[100040] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
        <div
          className={`flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:max-w-2xl sm:rounded-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}
        >
          <div
            className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 ${themeClasses.border} ${
              isDarkTheme ? 'bg-white/5' : 'bg-blue-50/80'
            }`}
          >
            <div className="min-w-0">
              <h3 className={`truncate text-sm font-bold ${themeClasses.textPrimary}`}>
                {record?.id ? 'Edit HSE Record' : 'Add HSE Record'}
              </h3>
              <p className={`truncate text-[10px] ${themeClasses.textSecondary}`}>{projectName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold transition-colors ${
                isDarkTheme
                  ? 'bg-white/10 text-white hover:bg-white/15'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              Close
            </button>
          </div>

          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    className={`mb-0.5 block text-[9px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}
                  >
                    Month
                  </label>
                  <select
                    value={values.month}
                    onChange={(e) => setValues((prev) => ({ ...prev, month: Number(e.target.value) }))}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none ${themeClasses.input}`}
                    required
                  >
                    {MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className={`mb-0.5 block text-[9px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}
                  >
                    Year
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={values.year}
                    onChange={(e) => setValues((prev) => ({ ...prev, year: Number(e.target.value) }))}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none ${themeClasses.input} ${themeClasses.placeholder}`}
                    required
                  />
                </div>
              </div>

              <div className={sectionClass}>
                {sectionTitle(isDarkTheme ? 'text-sky-300' : 'text-sky-700', '1–3 · Manpower (Workers + Staff)')}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                  <FieldInput
                    label="1 · Avg Daily Manpower (Workers + Staff)"
                    field="averageDailyManpower"
                    values={values}
                    onChange={handleNumberChange}
                    themeClasses={themeClasses}
                    step="0.01"
                  />
                  <FieldInput
                    label="2 · Working Days (for man days calc)"
                    field="workingDays"
                    values={values}
                    onChange={handleNumberChange}
                    themeClasses={themeClasses}
                  />
                </div>
                <div
                  className={`mt-2 grid grid-cols-3 gap-2 rounded-lg px-2 py-1.5 text-[10px] font-semibold ${
                    isDarkTheme ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-600'
                  }`}
                >
                  <span>
                    2 · Man days: <strong className="tabular-nums">{preview.manDays.toLocaleString('en-IN')}</strong>
                  </span>
                  <span>
                    3 · Man hrs: <strong className="tabular-nums">{preview.manHours.toLocaleString('en-IN')}</strong>
                  </span>
                  <span className={`text-[9px] ${themeClasses.textMuted}`}>Auto by server</span>
                </div>
              </div>

              <div className={sectionClass}>
                {sectionTitle(isDarkTheme ? 'text-rose-300' : 'text-rose-700', 'Incidents (4–8)')}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(
                    [
                      ['reportableAccidentLti', '4 · Reportable Accident (LTI)'],
                      ['dangerousOccurrences', '5 · Dangerous Occurrences'],
                      ['firstAidCases', '6 · First Aid Incidence'],
                      ['medicalTreatmentCases', '6 · Medical Treatment Case'],
                      ['nearMiss', '7 · Near Miss'],
                      ['utilityDamage', '8 · Utility Damage Incidence'],
                    ] as const
                  ).map(([field, label]) => (
                    <FieldInput
                      key={field}
                      label={label}
                      field={field}
                      values={values}
                      onChange={handleNumberChange}
                      themeClasses={themeClasses}
                    />
                  ))}
                </div>
              </div>

              <div className={sectionClass}>
                {sectionTitle(isDarkTheme ? 'text-amber-300' : 'text-amber-700', 'Legacy pyramid')}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ['fatalities', 'Fatalities'],
                      ['significant', 'Significant'],
                      ['major', 'Major'],
                      ['minor', 'Minor'],
                    ] as const
                  ).map(([field, label]) => (
                    <FieldInput
                      key={field}
                      label={label}
                      field={field}
                      values={values}
                      onChange={handleNumberChange}
                      themeClasses={themeClasses}
                    />
                  ))}
                </div>
              </div>

              <div className={sectionClass}>
                {sectionTitle(isDarkTheme ? 'text-violet-300' : 'text-violet-700', 'Man hours lost (9)')}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <FieldInput
                    label="9 · Man Hours Lost"
                    field="lossOfManhours"
                    values={values}
                    onChange={handleNumberChange}
                    themeClasses={themeClasses}
                    step="0.01"
                  />
                </div>
              </div>

              <div className={sectionClass}>
                {sectionTitle(isDarkTheme ? 'text-emerald-300' : 'text-emerald-700', 'Training & drills (10–12)')}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(
                    [
                      ['internalTrainingCount', '10 · Internal Training (count)'],
                      ['internalTrainingHours', '10 · Internal Training (hrs)'],
                      ['externalTrainingCount', '11 · External Training (count)'],
                      ['externalTrainingHours', '11 · External Training (hrs)'],
                      ['mockDrills', '12 · Mock Drills'],
                    ] as const
                  ).map(([field, label]) => (
                    <FieldInput
                      key={field}
                      label={label}
                      field={field}
                      values={values}
                      onChange={handleNumberChange}
                      themeClasses={themeClasses}
                      step={field.includes('Hours') ? '0.01' : '1'}
                    />
                  ))}
                </div>
              </div>

              <div className={sectionClass}>
                {sectionTitle(isDarkTheme ? 'text-indigo-300' : 'text-indigo-700', 'Medical checkup (13)')}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <FieldInput
                    label="13 · Medical Checkup — Workers"
                    field="medicalCheckupWorkers"
                    values={values}
                    onChange={handleNumberChange}
                    themeClasses={themeClasses}
                  />
                  <FieldInput
                    label="13 · Medical Checkup — Staff"
                    field="medicalCheckupStaff"
                    values={values}
                    onChange={handleNumberChange}
                    themeClasses={themeClasses}
                  />
                  <div>
                    <label
                      className={`mb-0.5 block text-[9px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}
                    >
                      Total (13 · auto)
                    </label>
                    <div
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums ${
                        isDarkTheme ? 'bg-white/10 text-white' : 'bg-white text-slate-800 border border-slate-200'
                      }`}
                    >
                      {preview.medicalTotal.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {(localError || error) && (
                <p className="text-xs font-semibold text-rose-500">{localError || error}</p>
              )}
            </div>

            <div
              className={`flex shrink-0 gap-2 border-t px-4 py-2.5 ${themeClasses.border} ${
                isDarkTheme ? 'bg-white/[0.02]' : 'bg-slate-50/50'
              }`}
            >
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  isDarkTheme
                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                    : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
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
