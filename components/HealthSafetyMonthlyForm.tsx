import React, { useMemo, useState } from 'react';
import type { HealthSafetyCreatePayload, HSERecord } from '../services/api';
import { findHealthSafetyRecordByPeriod } from '../services/api';
import { ModalPortal } from './ModalPortal';
import { getThemeClasses, useTheme } from '../utils/theme';
import { MONTH_OPTIONS } from '../utils/healthSafety';
import {
  extractUserFacingFieldErrors,
  formatUserFacingError,
  simplifyFieldErrorMessage,
} from '../utils/formErrors';

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

const HSE_FORM_FIELDS: NumberField[] = [
  'month',
  'year',
  'averageDailyManpower',
  'workingDays',
  'fatalities',
  'significant',
  'major',
  'minor',
  'nearMiss',
  'reportableAccidentLti',
  'dangerousOccurrences',
  'firstAidCases',
  'medicalTreatmentCases',
  'utilityDamage',
  'lossOfManhours',
  'internalTrainingCount',
  'internalTrainingHours',
  'externalTrainingCount',
  'externalTrainingHours',
  'mockDrills',
  'medicalCheckupWorkers',
  'medicalCheckupStaff',
];

const HSE_FIELD_SET = new Set<string>(HSE_FORM_FIELDS);

function toHseFormField(field: string): string {
  if (HSE_FIELD_SET.has(field)) return field;
  const camel = field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return HSE_FIELD_SET.has(camel) ? camel : field;
}

function mapHealthSafetyApiFieldErrors(error: unknown): Record<string, string> {
  const raw = extractUserFacingFieldErrors(error);
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(raw)) {
    if (key === 'non_field_errors' || key === 'detail' || key.startsWith('item_')) continue;
    const mapped = toHseFormField(key);
    if (!HSE_FIELD_SET.has(mapped)) continue;
    out[mapped] = simplifyFieldErrorMessage(mapped, message);
  }
  return out;
}

function validateHealthSafetyForm(
  values: HealthSafetyFormValues,
  existingRecords: HSERecord[],
  editingRecord?: HSERecord | null,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.month || values.month < 1 || values.month > 12) {
    errors.month = 'Select a month.';
  }
  if (!values.year || values.year < 2000 || values.year > 2100) {
    errors.year = 'Enter a valid year.';
  }
  if (!Number.isFinite(values.averageDailyManpower) || values.averageDailyManpower <= 0) {
    errors.averageDailyManpower = 'Enter average daily manpower greater than 0.';
  }
  if (!Number.isFinite(values.workingDays) || values.workingDays < 1 || values.workingDays > 31) {
    errors.workingDays = 'Working days must be between 1 and 31.';
  }

  const optionalCounts: NumberField[] = [
    'fatalities',
    'significant',
    'major',
    'minor',
    'nearMiss',
    'reportableAccidentLti',
    'dangerousOccurrences',
    'firstAidCases',
    'medicalTreatmentCases',
    'utilityDamage',
    'lossOfManhours',
    'internalTrainingCount',
    'internalTrainingHours',
    'externalTrainingCount',
    'externalTrainingHours',
    'mockDrills',
    'medicalCheckupWorkers',
    'medicalCheckupStaff',
  ];
  for (const field of optionalCounts) {
    const n = values[field];
    if (!Number.isFinite(n) || n < 0) {
      errors[field] = 'Enter 0 or a positive number.';
    }
  }

  const existingForPeriod = findHealthSafetyRecordByPeriod(
    existingRecords,
    values.month,
    values.year,
  );
  const isSameRecord =
    existingForPeriod &&
    editingRecord &&
    existingForPeriod.id != null &&
    editingRecord.id != null &&
    String(existingForPeriod.id) === String(editingRecord.id);
  if (existingForPeriod && !isSameRecord && !editingRecord?.id) {
    errors.month = 'A record for this month already exists. Pick another month or edit that record.';
  } else if (existingForPeriod && editingRecord?.id && !isSameRecord) {
    errors.month = 'A record for this month already exists. Pick another month.';
  }

  return errors;
}

function focusHseField(field: string) {
  window.requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-hse-field="${field}"]`)?.focus();
  });
}

const FieldInput: React.FC<{
  label: string;
  field: NumberField;
  values: HealthSafetyFormValues;
  onChange: (field: NumberField, raw: string) => void;
  themeClasses: ReturnType<typeof getThemeClasses>;
  step?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
}> = ({ label, field, values, onChange, themeClasses, step = '1', required, optional, error }) => (
  <div>
    <label
      className={`mb-0.5 block text-[9px] font-bold uppercase tracking-wide ${
        error ? 'text-rose-400' : themeClasses.textSecondary
      }`}
    >
      {label}
      {required ? <span className="text-rose-400"> *</span> : null}
      {optional ? (
        <span className={`ml-1 font-semibold normal-case tracking-normal ${themeClasses.textMuted}`}>
          Optional
        </span>
      ) : null}
    </label>
    <input
      type="number"
      min="0"
      step={step}
      data-hse-field={field}
      aria-invalid={Boolean(error)}
      value={values[field]}
      onChange={(e) => onChange(field, e.target.value)}
      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none ${themeClasses.input} ${
        themeClasses.placeholder
      } ${error ? 'border border-rose-500 ring-2 ring-rose-500/30' : ''}`}
    />
    {error && <p className="mt-0.5 text-[10px] font-semibold text-rose-500">{error}</p>}
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setLocalError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateHealthSafetyForm(values, existingRecords, record);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setLocalError('Fix the highlighted fields, then save.');
      const order = ['month', 'year', 'averageDailyManpower', 'workingDays'] as const;
      const first = order.find((key) => nextErrors[key]) ?? Object.keys(nextErrors)[0];
      if (first) focusHseField(first);
      return;
    }
    setLocalError(null);
    setFieldErrors({});
    const existingForPeriod = findHealthSafetyRecordByPeriod(existingRecords, values.month, values.year);
    const recordToSave =
      existingForPeriod ??
      (record?.month === values.month && record?.year === values.year ? record : null);
    try {
      const saved = await onSubmit(values, recordToSave);
      if (saved) onClose();
    } catch (err) {
      const mapped = mapHealthSafetyApiFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped);
        setLocalError('Fix the highlighted fields, then save.');
        const order = ['month', 'year', 'averageDailyManpower', 'workingDays'] as const;
        const first = order.find((key) => mapped[key]) ?? Object.keys(mapped)[0];
        if (first) focusHseField(first);
      } else {
        setLocalError(
          formatUserFacingError(err, {
            fallback: 'Unable to save this Health & Safety record. Check the form and try again.',
          }),
        );
      }
    }
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

          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <p className={`text-[10px] font-semibold ${themeClasses.textMuted}`}>
                Required: month, year, average daily manpower (greater than 0), and working days
                (1–31). All other counts are optional — leave 0 if none.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    className={`mb-0.5 block text-[9px] font-bold uppercase tracking-wide ${
                      fieldErrors.month ? 'text-rose-400' : themeClasses.textSecondary
                    }`}
                  >
                    Month <span className="text-rose-400">*</span>
                  </label>
                  <select
                    data-hse-field="month"
                    value={values.month}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, month: Number(e.target.value) }));
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.month;
                        return next;
                      });
                      setLocalError(null);
                    }}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none ${themeClasses.input} ${
                      fieldErrors.month ? 'border border-rose-500 ring-2 ring-rose-500/30' : ''
                    }`}
                  >
                    {MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.month && (
                    <p className="mt-0.5 text-[10px] font-semibold text-rose-500">{fieldErrors.month}</p>
                  )}
                </div>
                <div>
                  <label
                    className={`mb-0.5 block text-[9px] font-bold uppercase tracking-wide ${
                      fieldErrors.year ? 'text-rose-400' : themeClasses.textSecondary
                    }`}
                  >
                    Year <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    data-hse-field="year"
                    value={values.year}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, year: Number(e.target.value) }));
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.year;
                        return next;
                      });
                      setLocalError(null);
                    }}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none ${themeClasses.input} ${
                      themeClasses.placeholder
                    } ${fieldErrors.year ? 'border border-rose-500 ring-2 ring-rose-500/30' : ''}`}
                  />
                  {fieldErrors.year && (
                    <p className="mt-0.5 text-[10px] font-semibold text-rose-500">{fieldErrors.year}</p>
                  )}
                </div>
              </div>

              <div className={sectionClass}>
                {sectionTitle(isDarkTheme ? 'text-sky-300' : 'text-sky-700', '1–3 · Manpower (required)')}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                  <FieldInput
                    label="1 · Avg Daily Manpower (Workers + Staff)"
                    field="averageDailyManpower"
                    values={values}
                    onChange={handleNumberChange}
                    themeClasses={themeClasses}
                    step="0.01"
                    required
                    error={fieldErrors.averageDailyManpower}
                  />
                  <FieldInput
                    label="2 · Working Days"
                    field="workingDays"
                    values={values}
                    onChange={handleNumberChange}
                    themeClasses={themeClasses}
                    required
                    error={fieldErrors.workingDays}
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
                {sectionTitle(isDarkTheme ? 'text-rose-300' : 'text-rose-700', 'Incidents (4–8) · optional, use 0 if none')}
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
                      optional
                      error={fieldErrors[field]}
                    />
                  ))}
                </div>
              </div>

              <div className={sectionClass}>
                {sectionTitle(isDarkTheme ? 'text-amber-300' : 'text-amber-700', 'Legacy pyramid · optional, use 0 if none')}
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
                      optional
                      error={fieldErrors[field]}
                    />
                  ))}
                </div>
              </div>

              <div className={sectionClass}>
                {sectionTitle(isDarkTheme ? 'text-violet-300' : 'text-violet-700', 'Man hours lost (9) · optional')}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <FieldInput
                    label="9 · Man Hours Lost"
                    field="lossOfManhours"
                    values={values}
                    onChange={handleNumberChange}
                    themeClasses={themeClasses}
                    step="0.01"
                    optional
                    error={fieldErrors.lossOfManhours}
                  />
                </div>
              </div>

              <div className={sectionClass}>
                {sectionTitle(isDarkTheme ? 'text-emerald-300' : 'text-emerald-700', 'Training & drills (10–12) · optional')}
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
                      optional
                      error={fieldErrors[field]}
                    />
                  ))}
                </div>
              </div>

              <div className={sectionClass}>
                {sectionTitle(isDarkTheme ? 'text-indigo-300' : 'text-indigo-700', 'Medical checkup (13) · optional')}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <FieldInput
                    label="13 · Medical Checkup — Workers"
                    field="medicalCheckupWorkers"
                    values={values}
                    onChange={handleNumberChange}
                    themeClasses={themeClasses}
                    optional
                    error={fieldErrors.medicalCheckupWorkers}
                  />
                  <FieldInput
                    label="13 · Medical Checkup — Staff"
                    field="medicalCheckupStaff"
                    values={values}
                    onChange={handleNumberChange}
                    themeClasses={themeClasses}
                    optional
                    error={fieldErrors.medicalCheckupStaff}
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
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300"
                >
                  {localError || error}
                </div>
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
