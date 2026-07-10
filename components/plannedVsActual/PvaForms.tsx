import React, { useEffect, useId, useRef, useState } from 'react';
import type { ContractorMasterRecord } from '../../types/contractorManagement';
import type { PvaCreatePayload, PvaPartyType, PvaRecord } from '../../types/plannedVsActual';
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

type FieldKey = 'planned_value' | 'actual_value' | 'collection' | 'reason' | 'remarks';

const inputClassFor = (isDark: boolean) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 ${
    isDark
      ? 'border-white/15 bg-white/5 text-slate-100'
      : 'border-slate-200 bg-white text-slate-900'
  }`;

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
  const inputClass = inputClassFor(isDarkTheme);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
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
    if (!contractorId) {
      setForm(emptyForm());
      return;
    }
    const match = findContractorRecord(existingContractors, contractorId);
    setForm(recordToForm(match, contractorId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyType, periodKey, selectedContractorId]);

  const updateField = (key: FieldKey, value: string) => {
    userEdited.current = true;
    setLocalSuccess(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickContractor = (contractorId: string) => {
    userEdited.current = false;
    hydratedContractor.current = contractorId;
    setLocalError(null);
    setLocalSuccess(null);
    onContractorSelect?.(contractorId);
    const match = findContractorRecord(existingContractors, contractorId);
    setForm(recordToForm(match, contractorId));
  };

  const submit = async () => {
    setLocalError(null);
    setLocalSuccess(null);

    if (isBlank(form.planned_value) || isBlank(form.actual_value) || isBlank(form.collection)) {
      setLocalError('Planned Value, Actual Value and Collection are required.');
      return;
    }
    if (partyType === 'CONTRACTOR' && !form.contractor_id) {
      setLocalError('Select a contractor before saving.');
      return;
    }
    if (reasonRequired(form.planned_value, form.actual_value) && isBlank(form.reason)) {
      setLocalError('Reason is mandatory when Planned exceeds Actual (difference > 0).');
      return;
    }

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
            ? 'SCL record saved (updated). Contractor form was not changed.'
            : 'SCL record saved (created). Contractor form was not changed.'
          : action === 'updated'
            ? 'Contractor record saved (updated). SCL form was not changed.'
            : 'Contractor record saved (created). SCL form was not changed.',
      );
      if (partyType === 'CONTRACTOR' && form.contractor_id) {
        onContractorSelect?.(form.contractor_id);
      }
    } catch {
      if (globalError) setLocalError(globalError);
    } finally {
      setSaving(false);
    }
  };

  const hasExisting =
    Boolean(form.recordId) ||
    (partyType === 'SCL'
      ? initialRecord?.id != null
      : findContractorRecord(existingContractors, form.contractor_id)?.id != null);

  const field = (key: FieldKey, label: string, required = false, multiline = false) => {
    const id = `${formDomId}-${partyType}-${key}`;
    return (
      <label className={key === 'reason' || key === 'remarks' || key === 'collection' ? 'sm:col-span-2' : ''}>
        <span className={`mb-1 block text-[10px] font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>
          {label}
          {required || (key === 'reason' && reasonRequired(form.planned_value, form.actual_value))
            ? ' *'
            : ''}
        </span>
        {multiline ? (
          <textarea
            id={id}
            name={id}
            autoComplete="off"
            disabled={saving || !projectName}
            className={`${inputClass} min-h-[72px] resize-y`}
            value={form[key]}
            onChange={(e) => updateField(key, e.target.value)}
          />
        ) : (
          <input
            id={id}
            name={id}
            type={key === 'reason' ? 'text' : 'number'}
            step="any"
            autoComplete="off"
            disabled={saving || !projectName}
            className={inputClass}
            value={form[key]}
            onChange={(e) => updateField(key, e.target.value)}
            placeholder={
              key === 'reason' && reasonRequired(form.planned_value, form.actual_value)
                ? 'Required when Planned > Actual'
                : undefined
            }
          />
        )}
      </label>
    );
  };

  return (
    <div
      className={`flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-white/[0.03] ${
        isDarkTheme ? 'border-white/10' : 'border-slate-200'
      }`}
    >
      <div className={`border-b px-4 py-3 ${accentClass} ${isDarkTheme ? 'border-white/10' : 'border-slate-100'}`}>
        <h3 className={`text-sm font-black uppercase tracking-wide ${themeClasses.textPrimary}`}>
          {title}
        </h3>
        <p className={`mt-0.5 text-[11px] ${themeClasses.textMuted}`}>{subtitle}</p>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {(localError || (saving ? null : null)) && localError && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {localError}
          </p>
        )}
        {localSuccess && !localError && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            {localSuccess}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {partyType === 'CONTRACTOR' && (
            <label className="sm:col-span-2">
              <span className={`mb-1 block text-[10px] font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>
                Contractor *
              </span>
              <select
                id={`${formDomId}-contractor`}
                name={`${formDomId}-contractor`}
                className={inputClass}
                value={form.contractor_id}
                disabled={saving || !projectName || contractors.length === 0}
                autoComplete="off"
                onChange={(e) => pickContractor(e.target.value)}
              >
                <option value="">
                  {contractors.length === 0 ? 'No contractors available…' : 'Select contractor…'}
                </option>
                {contractors.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.contractor_name}
                  </option>
                ))}
              </select>
              {contractors.length === 0 && projectName && (
                <p className="mt-1 text-[11px] font-semibold text-amber-700">
                  Add contractors in Contractor Management, then Refresh.
                </p>
              )}
            </label>
          )}

          {field('planned_value', 'Planned Value', true)}
          {field('actual_value', 'Actual Value', true)}
          {field('collection', 'Collection', true)}
          {field('reason', 'Reason for Difference')}
          {field('remarks', 'Remarks', false, true)}
        </div>

        <div className="mt-auto pt-2">
          <button
            type="button"
            disabled={
              saving ||
              !projectName ||
              (partyType === 'CONTRACTOR' && (!form.contractor_id || contractors.length === 0))
            }
            onClick={() => void submit()}
            className={`w-full rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white disabled:opacity-50 ${
              partyType === 'SCL'
                ? 'bg-slate-800 hover:bg-slate-900'
                : 'bg-indigo-600 hover:bg-indigo-700'
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
      </div>
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
        <h2 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
          Update Records
        </h2>
        <p className={`mt-1 text-[11px] ${themeClasses.textMuted}`}>
          Separate forms · POST upsert (create or update) · Reason required when Planned &gt; Actual
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
      {success && !error && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {success}
        </p>
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
