import React, { useEffect, useId, useRef, useState } from 'react';
import type { ContractorMasterRecord } from '../../types/contractorManagement';
import type { PvaCreatePayload, PvaPartyType, PvaRecord } from '../../types/plannedVsActual';
import { getPvaApiErrorMessage } from '../../services/plannedVsActualApi';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface PvaFormsProps {
  projectName: string;
  month: number;
  year: number;
  contractors: ContractorMasterRecord[];
  selectedContractorId?: string | null;
  existingScl?: PvaRecord | null;
  existingContractors?: PvaRecord[];
  onContractorSelect?: (contractorId: string) => void;
  onSubmit: (
    payload: PvaCreatePayload,
    existingId?: string | number | null,
  ) => Promise<{ record: PvaRecord; action: 'created' | 'updated' } | PvaRecord | null | void>;
  isSaving?: boolean;
  error?: string | null;
  success?: string | null;
}

type FormState = {
  recordId: string;
  planned_value: string;
  actual_value: string;
  collection: string;
  reason: string;
  remarks: string;
  contractor_id: string;
};

const emptyForm = (): FormState => ({
  recordId: '',
  planned_value: '',
  actual_value: '',
  collection: '',
  reason: '',
  remarks: '',
  contractor_id: '',
});

const recordToForm = (record: PvaRecord | null | undefined, contractorId = ''): FormState => {
  if (!record) return { ...emptyForm(), contractor_id: contractorId };
  return {
    recordId: record.id != null ? String(record.id) : '',
    planned_value: String(record.plannedValue ?? ''),
    actual_value: String(record.actualValue ?? ''),
    collection: String(record.collection ?? ''),
    reason: record.reason ?? '',
    remarks: record.remarks ?? '',
    contractor_id: contractorId || (record.contractorId != null ? String(record.contractorId) : ''),
  };
};

const findContractorRecord = (rows: PvaRecord[], contractorId: string): PvaRecord | null => {
  if (!contractorId) return null;
  return (
    rows.find((row) => {
      const party = String(row.partyType ?? '').toUpperCase();
      if (party === 'SCL' || party === 'PMC' || party === 'CONTRACTOR_SUMMARY') return false;
      return row.contractorId != null && String(row.contractorId) === String(contractorId);
    }) ?? null
  );
};

const isBlank = (value: string) => value.trim() === '';

const reasonRequired = (planned: string, actual: string) => {
  if (isBlank(planned) || isBlank(actual)) return false;
  // Backend: reason_for_difference required when difference > 0 (planned − actual)
  return Number(planned) - Number(actual) > 0;
};

type FieldKey =
  | 'planned_value'
  | 'actual_value'
  | 'collection'
  | 'reason'
  | 'remarks'
  | 'contractor_id';

const parseAmount = (value: string): number | null => {
  if (isBlank(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
};

const validatePartyForm = (
  form: FormState,
  partyType: PvaPartyType,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (partyType === 'CONTRACTOR' && !form.contractor_id) {
    errors.contractor_id = 'Select a contractor.';
  }

  const planned = parseAmount(form.planned_value);
  const actual = parseAmount(form.actual_value);
  const collection = parseAmount(form.collection);

  if (planned === null) errors.planned_value = 'Enter planned value.';
  else if (Number.isNaN(planned) || planned < 0) {
    errors.planned_value = 'Enter a valid amount (0 or more).';
  }

  if (actual === null) errors.actual_value = 'Enter actual value.';
  else if (Number.isNaN(actual) || actual < 0) {
    errors.actual_value = 'Enter a valid amount (0 or more).';
  }

  if (collection === null) errors.collection = 'Enter collection amount.';
  else if (Number.isNaN(collection) || collection < 0) {
    errors.collection = 'Enter a valid amount (0 or more).';
  }

  if (reasonRequired(form.planned_value, form.actual_value) && isBlank(form.reason)) {
    errors.reason = 'Reason is required when planned is greater than actual.';
  }

  return errors;
};

const inputClassFor = (isDark: boolean, hasError = false) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition ${
    hasError
      ? 'border-rose-500 ring-2 ring-rose-500/30'
      : isDark
        ? 'border-white/15 bg-white/5 text-slate-100 focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/25'
        : 'border-slate-200 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
  } disabled:cursor-not-allowed disabled:opacity-60`;

/** One independent form — never shares state with the other party. */
const PartyFormCard: React.FC<{
  partyType: PvaPartyType;
  title: string;
  subtitle: string;
  accentClass: string;
  projectName: string;
  month: number;
  year: number;
  initialRecord: PvaRecord | null;
  contractors?: ContractorMasterRecord[];
  selectedContractorId?: string | null;
  existingContractors?: PvaRecord[];
  onContractorSelect?: (contractorId: string) => void;
  onSubmit: (
    payload: PvaCreatePayload,
    existingId?: string | number | null,
  ) => Promise<{ record: PvaRecord; action: 'created' | 'updated' } | PvaRecord | null | void>;
  globalError?: string | null;
}> = ({
  partyType,
  title,
  subtitle,
  accentClass,
  projectName,
  month,
  year,
  initialRecord,
  contractors = [],
  selectedContractorId = null,
  existingContractors = [],
  onContractorSelect,
  onSubmit,
  globalError = null,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const formDomId = useId();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const hydratedPeriod = useRef('');
  const hydratedContractor = useRef('');
  const userEdited = useRef(false);

  const periodKey = `${projectName}|${month}|${year}`;

  // Hydrate ONLY this form when project/period changes
  useEffect(() => {
    userEdited.current = false;
    hydratedContractor.current = '';
    setLocalError(null);
    setLocalSuccess(null);
    setFieldErrors({});

    if (partyType === 'SCL') {
      hydratedPeriod.current = periodKey;
      setForm(recordToForm(initialRecord));
      return;
    }

    // Contractor: keep selected id if any, load that contractor's record only
    const contractorId = selectedContractorId || '';
    hydratedPeriod.current = periodKey;
    hydratedContractor.current = contractorId;
    if (!contractorId) {
      setForm(emptyForm());
      return;
    }
    const match = findContractorRecord(existingContractors, contractorId);
    setForm(recordToForm(match, contractorId));
    // intentionally not depending on initialRecord/existingContractors continuously —
    // periodKey + selectedContractorId drive hydration to avoid cross-form updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodKey, partyType]);

  // SCL: apply server record once per period when it first arrives (not on every refresh)
  useEffect(() => {
    if (partyType !== 'SCL') return;
    if (!projectName || userEdited.current) return;
    if (hydratedPeriod.current !== periodKey) return;
    if (!initialRecord) return;
    // Only fill if form still empty (first load) or never edited
    const formEmpty =
      isBlank(form.planned_value) && isBlank(form.actual_value) && isBlank(form.collection);
    if (formEmpty) {
      setForm(recordToForm(initialRecord));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyType, periodKey, initialRecord?.id]);

  // Contractor: when dropdown selection changes (from this form or top filter)
  useEffect(() => {
    if (partyType !== 'CONTRACTOR') return;
    if (!projectName) return;
    const contractorId = selectedContractorId || '';
    if (hydratedContractor.current === contractorId && hydratedPeriod.current === periodKey) {
      return;
    }
    hydratedContractor.current = contractorId;
    hydratedPeriod.current = periodKey;
    userEdited.current = false;
    setLocalError(null);
    setLocalSuccess(null);
    setFieldErrors({});
    if (!contractorId) {
      setForm(emptyForm());
      return;
    }
    const match = findContractorRecord(existingContractors, contractorId);
    setForm(recordToForm(match, contractorId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyType, periodKey, selectedContractorId]);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setLocalError(null);
  };

  const updateField = (key: FieldKey, value: string) => {
    userEdited.current = true;
    setLocalSuccess(null);
    clearFieldError(key);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickContractor = (contractorId: string) => {
    userEdited.current = false;
    hydratedContractor.current = contractorId;
    setLocalError(null);
    setLocalSuccess(null);
    setFieldErrors({});
    onContractorSelect?.(contractorId);
    const match = findContractorRecord(existingContractors, contractorId);
    setForm(recordToForm(match, contractorId));
  };

  const submit = async () => {
    const nextErrors = validatePartyForm(form, partyType);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setLocalError([...new Set(Object.values(nextErrors))].join(' '));
      setLocalSuccess(null);
      const order: FieldKey[] = [
        'contractor_id',
        'planned_value',
        'actual_value',
        'collection',
        'reason',
      ];
      const first = order.find((key) => nextErrors[key]);
      if (first) {
        window.requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(`[data-pva-field="${formDomId}-${first}"]`)
            ?.focus();
        });
      }
      return;
    }

    setLocalError(null);
    setLocalSuccess(null);
    setFieldErrors({});

    const selected = contractors.find((c) => String(c.id) === form.contractor_id);
    const payload: PvaCreatePayload = {
      project_name: projectName,
      month,
      year,
      planned_type: partyType,
      planned_value: Number(form.planned_value),
      actual_value: Number(form.actual_value),
      collection: Number(form.collection),
      reason_for_difference: form.reason.trim() || undefined,
      remarks: form.remarks.trim() || undefined,
    };

    let existingId: string | number | null = form.recordId ? form.recordId : null;
    if (partyType === 'CONTRACTOR') {
      payload.contractor_id = Number(form.contractor_id);
      payload.contractor_name = selected?.contractor_name;
      if (existingId == null) {
        existingId = findContractorRecord(existingContractors, form.contractor_id)?.id ?? null;
      }
    } else if (existingId == null) {
      existingId = initialRecord?.id ?? null;
    }

    const isUpdate = existingId != null && existingId !== '';

    setSaving(true);
    try {
      const result = await onSubmit(payload, existingId);
      const saved =
        result && typeof result === 'object' && 'record' in result && 'action' in result
          ? result.record
          : (result as PvaRecord | null | void);
      const action =
        result && typeof result === 'object' && 'action' in result
          ? result.action
          : isUpdate
            ? 'updated'
            : 'created';

      // Keep returned id for UI state; save always uses POST upsert
      if (saved) {
        setForm(
          recordToForm(
            saved,
            partyType === 'CONTRACTOR' ? form.contractor_id : '',
          ),
        );
      } else if (action === 'updated' && existingId != null) {
        setForm((prev) => ({ ...prev, recordId: String(existingId) }));
      }
      userEdited.current = false;
      setLocalSuccess(
        partyType === 'SCL'
          ? action === 'updated'
            ? 'SCL record saved.'
            : 'SCL record created.'
          : action === 'updated'
            ? 'Contractor record saved.'
            : 'Contractor record created.',
      );
      if (partyType === 'CONTRACTOR' && form.contractor_id) {
        onContractorSelect?.(form.contractor_id);
      }
    } catch (err) {
      setLocalError(
        globalError || getPvaApiErrorMessage(err, 'Could not save this record. Please try again.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const hasExisting =
    Boolean(form.recordId) ||
    (partyType === 'SCL'
      ? initialRecord?.id != null
      : findContractorRecord(existingContractors, form.contractor_id)?.id != null);

  const reasonNeeded = reasonRequired(form.planned_value, form.actual_value);
  const plannedNum = parseAmount(form.planned_value);
  const actualNum = parseAmount(form.actual_value);
  const showGap =
    plannedNum != null &&
    actualNum != null &&
    !Number.isNaN(plannedNum) &&
    !Number.isNaN(actualNum);

  const field = (
    key: FieldKey,
    label: string,
    options?: { required?: boolean; multiline?: boolean; optional?: boolean; span2?: boolean },
  ) => {
    const id = `${formDomId}-${partyType}-${key}`;
    const required =
      options?.required || (key === 'reason' && reasonNeeded);
    const hasError = Boolean(fieldErrors[key]);
    return (
      <div className={options?.span2 || options?.multiline || key === 'reason' || key === 'remarks' || key === 'collection' ? 'sm:col-span-2' : ''}>
        <label htmlFor={id} className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${hasError ? 'text-rose-400' : themeClasses.textMuted}`}>
          {label}
          {required ? <span className="text-rose-400"> *</span> : null}
          {options?.optional ? (
            <span className={`ml-1 font-semibold normal-case tracking-normal ${themeClasses.textMuted}`}>
              Optional
            </span>
          ) : null}
        </label>
        {options?.multiline ? (
          <textarea
            id={id}
            data-pva-field={`${formDomId}-${key}`}
            name={id}
            autoComplete="off"
            disabled={saving || !projectName}
            aria-invalid={hasError}
            className={`${inputClassFor(isDarkTheme, hasError)} min-h-[80px] resize-y font-medium`}
            value={form[key]}
            onChange={(e) => updateField(key, e.target.value)}
            placeholder={
              key === 'reason' && reasonNeeded
                ? 'Required because planned is greater than actual'
                : undefined
            }
          />
        ) : (
          <input
            id={id}
            data-pva-field={`${formDomId}-${key}`}
            name={id}
            type={key === 'reason' ? 'text' : 'number'}
            step="any"
            min={key === 'reason' ? undefined : 0}
            autoComplete="off"
            disabled={saving || !projectName}
            aria-invalid={hasError}
            className={inputClassFor(isDarkTheme, hasError)}
            value={form[key]}
            onChange={(e) => updateField(key, e.target.value)}
            placeholder={key === 'reason' && reasonNeeded ? 'Explain the shortfall' : '0'}
          />
        )}
        {hasError && (
          <p className="mt-1 text-xs font-semibold text-rose-500">{fieldErrors[key]}</p>
        )}
      </div>
    );
  };

  return (
    <div
      className={`${themeClasses.glassCard} flex h-full min-h-[28rem] flex-col overflow-hidden rounded-2xl border shadow-sm ${themeClasses.border}`}
    >
      <div
        className={`border-b px-5 py-4 ${accentClass} ${isDarkTheme ? 'border-white/10' : 'border-slate-100'}`}
      >
        <h3 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
          {title}
        </h3>
        <p className={`mt-1 text-[11px] font-semibold ${themeClasses.textMuted}`}>{subtitle}</p>
      </div>

      <form
        className="flex flex-1 flex-col gap-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        {localError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
          >
            {localError}
          </div>
        )}
        {localSuccess && !localError && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            {localSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {partyType === 'CONTRACTOR' && (
            <div className="sm:col-span-2">
              <label
                htmlFor={`${formDomId}-contractor`}
                className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${
                  fieldErrors.contractor_id ? 'text-rose-400' : themeClasses.textMuted
                }`}
              >
                Contractor <span className="text-rose-400">*</span>
              </label>
              <select
                id={`${formDomId}-contractor`}
                data-pva-field={`${formDomId}-contractor_id`}
                name={`${formDomId}-contractor`}
                className={inputClassFor(isDarkTheme, Boolean(fieldErrors.contractor_id))}
                value={form.contractor_id}
                disabled={saving || !projectName || contractors.length === 0}
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.contractor_id)}
                onChange={(e) => pickContractor(e.target.value)}
              >
                <option value="">
                  {contractors.length === 0 ? 'No contractors available' : 'Select contractor'}
                </option>
                {contractors.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.contractor_name}
                  </option>
                ))}
              </select>
              {fieldErrors.contractor_id && (
                <p className="mt-1 text-xs font-semibold text-rose-500">{fieldErrors.contractor_id}</p>
              )}
              {contractors.length === 0 && projectName && (
                <p className="mt-1 text-[11px] font-semibold text-amber-500">
                  Add contractors in Contractor Management first, then refresh.
                </p>
              )}
            </div>
          )}

          {field('planned_value', 'Planned Value', { required: true })}
          {field('actual_value', 'Actual Value', { required: true })}
          {field('collection', 'Collection', { required: true, span2: true })}
          {field('reason', 'Reason for Difference', { multiline: true })}
          {field('remarks', 'Remarks', { multiline: true, optional: true })}
        </div>

        {showGap && (
          <p className={`text-[11px] font-semibold ${themeClasses.textMuted}`}>
            Difference (planned − actual):{' '}
            <span className={plannedNum! > actualNum! ? 'text-amber-400' : themeClasses.textPrimary}>
              {(plannedNum! - actualNum!).toLocaleString('en-IN')}
            </span>
            {reasonNeeded ? ' · Reason is required' : ''}
          </p>
        )}

        <div className="mt-auto pt-3">
          <button
            type="submit"
            disabled={saving || !projectName}
            className={`w-full rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition disabled:opacity-50 ${
              partyType === 'SCL'
                ? 'bg-slate-800 hover:bg-slate-700'
                : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {saving
              ? 'Saving…'
              : partyType === 'SCL'
                ? hasExisting
                  ? 'Update SCL Only'
                  : 'Save SCL Only'
                : hasExisting
                  ? 'Update Contractor Only'
                  : 'Save Contractor Only'}
          </button>
        </div>
      </form>
    </div>
  );
};

const PvaForms: React.FC<PvaFormsProps> = ({
  projectName,
  month,
  year,
  contractors,
  selectedContractorId = null,
  existingScl = null,
  existingContractors = [],
  onContractorSelect,
  onSubmit,
  error = null,
  success = null,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <section className="space-y-3">
      <div>
        <h2 className={`text-lg font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
          Update Records
        </h2>
        <p className={`mt-1 text-[12px] font-semibold ${themeClasses.textMuted}`}>
          Save SCL and contractor separately. Reason is required only when planned is greater than
          actual.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {error}
        </div>
      )}
      {success && !error && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {success}
        </div>
      )}
      {!projectName && (
        <p className={`text-sm ${themeClasses.textMuted}`}>
          Select a project above to update Planned vs Actual records.
        </p>
      )}

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <PartyFormCard
          partyType="SCL"
          title="SCL Form"
          subtitle="Owner / SCL values only"
          accentClass={isDarkTheme ? 'bg-slate-500/10' : 'bg-slate-50'}
          projectName={projectName}
          month={month}
          year={year}
          initialRecord={existingScl}
          onSubmit={onSubmit}
          globalError={error}
        />
        <PartyFormCard
          partyType="CONTRACTOR"
          title="Contractor Form"
          subtitle="Selected contractor values only"
          accentClass={isDarkTheme ? 'bg-indigo-500/10' : 'bg-indigo-50/60'}
          projectName={projectName}
          month={month}
          year={year}
          initialRecord={null}
          contractors={contractors}
          selectedContractorId={selectedContractorId}
          existingContractors={existingContractors}
          onContractorSelect={onContractorSelect}
          onSubmit={onSubmit}
          globalError={error}
        />
      </div>
    </section>
  );
};

export default React.memo(PvaForms);
