import React, { useEffect, useState } from 'react';
import type {
  CorrespondenceCategory,
  CorrespondenceDocument,
  CorrespondenceDocumentScope,
  CorrespondenceRecipientType,
  CorrespondenceType,
} from '../types';
import { ModalPortal } from './ModalPortal';
import { Icons } from './Icons';
import {
  type CorrespondenceDocumentFormValues,
  MONTH_OPTIONS,
  buildCorrespondenceYearOptions,
  formatCorrespondenceDisplayDate,
  isSclOutboundDocument,
  nextCorrespondenceSrNo,
  normalizeCorrespondenceCategory,
  normalizeCorrespondenceRecipientType,
  validateCorrespondenceDocumentFields,
} from '../utils/correspondence';
import CorrespondenceFormAttachments, {
  uploadCorrespondencePendingAttachments,
} from './CorrespondenceFormAttachments';
import { getThemeClasses, useTheme } from '../utils/theme';
import {
  extractUserFacingFieldErrors,
  formatUserFacingError,
  simplifyFieldErrorMessage,
} from '../utils/formErrors';

const CORRESPONDENCE_FORM_FIELDS = [
  'month',
  'year',
  'correspondenceType',
  'recipientType',
  'correspondenceCategory',
  'srNo',
  'description',
  'receivedDate',
  'deliveredDate',
] as const;

const CORRESPONDENCE_FIELD_ALIASES: Record<string, string> = {
  correspondence_type: 'correspondenceType',
  recipient_type: 'recipientType',
  correspondence_category: 'correspondenceCategory',
  sr_no: 'srNo',
  received_date: 'receivedDate',
  delivered_date: 'deliveredDate',
};

function mapCorrespondenceApiFieldErrors(err: unknown): Record<string, string> {
  const raw = extractUserFacingFieldErrors(err);
  const allowed = new Set<string>(CORRESPONDENCE_FORM_FIELDS);
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(raw)) {
    const mapped =
      CORRESPONDENCE_FIELD_ALIASES[key] ??
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    if (!allowed.has(mapped)) continue;
    out[mapped] = simplifyFieldErrorMessage(mapped, message);
  }
  return out;
}

function focusCorrespondenceField(field: string) {
  window.requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-corr-field="${field}"]`)?.focus();
  });
}

export type { CorrespondenceDocumentFormValues };

interface CorrespondenceDocumentFormProps {
  projectName: string;
  selectedMonth: number;
  selectedYear: number;
  initialType?: CorrespondenceType;
  initialScope?: CorrespondenceDocumentScope;
  document?: CorrespondenceDocument | null;
  documents?: CorrespondenceDocument[];
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: CorrespondenceDocumentFormValues) => Promise<CorrespondenceDocument | null>;
  onAttachmentsChanged?: () => void;
}

function buildInitialValues(
  document: CorrespondenceDocument | null | undefined,
  selectedMonth: number,
  selectedYear: number,
  initialType: CorrespondenceType,
  initialScope: CorrespondenceDocumentScope,
  documents: CorrespondenceDocument[],
): CorrespondenceDocumentFormValues {
  if (document) {
    const documentScope = isSclOutboundDocument(document) ? 'scl' : 'party';
    return {
      month: document.month,
      year: document.year,
      documentScope,
      correspondenceType: document.correspondenceType,
      recipientType: normalizeCorrespondenceRecipientType(document.recipientType),
      correspondenceCategory: document.correspondenceCategory ?? 'DELIVERY',
      srNo: document.srNo,
      description: document.description,
      receivedDate: document.receivedDate,
      deliveredDate: document.deliveredDate ?? '',
    };
  }

  return {
    month: selectedMonth,
    year: selectedYear,
    documentScope: initialScope,
    correspondenceType: initialType,
    recipientType: initialScope === 'scl' ? 'CLIENT' : '',
    correspondenceCategory: 'DELIVERY',
    srNo: nextCorrespondenceSrNo(documents, initialType, selectedMonth, selectedYear),
    description: '',
    receivedDate: '',
    deliveredDate: '',
  };
}

const CorrespondenceDocumentForm: React.FC<CorrespondenceDocumentFormProps> = ({
  projectName,
  selectedMonth,
  selectedYear,
  initialType = 'CLIENT',
  initialScope = 'party',
  document,
  documents = [],
  isSaving,
  error,
  onClose,
  onSubmit,
  onAttachmentsChanged,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const isEditing = Boolean(document);

  const [values, setValues] = useState<CorrespondenceDocumentFormValues>(() =>
    buildInitialValues(document, selectedMonth, selectedYear, initialType, initialScope, documents),
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [savedDocumentId, setSavedDocumentId] = useState<string | number | null>(document?.id ?? null);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setLocalError(null);
  };

  const isSclDocument = values.documentScope === 'scl';
  const isDelivery = values.correspondenceCategory === 'DELIVERY';

  useEffect(() => {
    setSavedDocumentId(document?.id ?? null);
    setPendingFiles([]);
  }, [document]);

  useEffect(() => {
    if (isEditing) return;
    if (isSclDocument) return;
    setValues((prev) => ({
      ...prev,
      srNo: nextCorrespondenceSrNo(documents, prev.correspondenceType, prev.month, prev.year),
    }));
  }, [documents, values.month, values.year, values.correspondenceType, isEditing, isSclDocument]);

  const handleCategoryChange = (category: CorrespondenceCategory) => {
    setValues((prev) => ({
      ...prev,
      correspondenceCategory: category,
      deliveredDate: category === 'RECORD' ? '' : prev.deliveredDate,
    }));
    clearFieldError('correspondenceCategory');
    clearFieldError('deliveredDate');
  };

  const persist = async (closeOnSuccess: boolean) => {
    const nextErrors = validateCorrespondenceDocumentFields(values);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setLocalError('Fix the highlighted fields, then save.');
      const order = [
        'description',
        'receivedDate',
        'deliveredDate',
        'month',
        'year',
        'correspondenceType',
        'recipientType',
        'correspondenceCategory',
        'srNo',
      ] as const;
      const first = order.find((key) => nextErrors[key]) ?? Object.keys(nextErrors)[0];
      if (first) focusCorrespondenceField(first);
      return;
    }
    setLocalError(null);
    setFieldErrors({});
    try {
      const saved = await onSubmit(values);
      if (!saved) return;

      const targetId = saved.id ?? savedDocumentId;
      if (targetId != null && pendingFiles.length > 0) {
        try {
          await uploadCorrespondencePendingAttachments(targetId, pendingFiles);
          setPendingFiles([]);
          onAttachmentsChanged?.();
        } catch (uploadError) {
          setLocalError(
            uploadError instanceof Error ? uploadError.message : 'Document saved but attachment upload failed.',
          );
          if (saved.id != null) setSavedDocumentId(saved.id);
          return;
        }
      } else if (saved.id != null) {
        setSavedDocumentId(saved.id);
      }

      if (closeOnSuccess) {
        onClose();
        return;
      }

      const { month, year, correspondenceType, correspondenceCategory, documentScope, recipientType } = values;
      setValues({
        month,
        year,
        documentScope,
        correspondenceType,
        recipientType: documentScope === 'scl' ? recipientType || 'CLIENT' : '',
        correspondenceCategory,
        srNo: documentScope === 'scl' ? 1 : values.srNo + 1,
        description: '',
        receivedDate: '',
        deliveredDate: '',
      });
      setFieldErrors({});
      setLocalError(null);
    } catch (err) {
      const mapped = mapCorrespondenceApiFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped);
        setLocalError('Fix the highlighted fields, then save.');
        const first = Object.keys(mapped)[0];
        if (first) focusCorrespondenceField(first);
      } else {
        setLocalError(
          formatUserFacingError(err, {
            fallback: 'Unable to save this document. Check the form and try again.',
          }),
        );
      }
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await persist(true);
  };

  const saveAndAddAnother = async () => {
    await persist(false);
  };

  const inputClass = `w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`;
  const labelClass = `mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`;
  const readOnlyClass = `${inputClass} cursor-not-allowed opacity-80`;
  const fieldErrorClass = 'border border-rose-500 ring-2 ring-rose-500/30';
  const fieldErrorText = 'mt-1 text-xs font-semibold text-rose-500';

  const fieldLabel = (field: string, label: React.ReactNode, required?: boolean) => (
    <label className={`${labelClass}${fieldErrors[field] ? ' text-rose-500' : ''}`}>
      {label}
      {required ? <span className="text-rose-500"> *</span> : null}
    </label>
  );

  const fieldMessage = (field: string) =>
    fieldErrors[field] ? <p className={fieldErrorText}>{fieldErrors[field]}</p> : null;

  const deadlineDisplay = document?.deadlineDate
    ? formatCorrespondenceDisplayDate(document.deadlineDate)
    : 'Set by system after save';

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4">
        <div
          className={`flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}
        >
          <div className={`shrink-0 border-b p-6 pb-4 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
                  {isEditing ? 'Update Documents' : isSclDocument ? 'Add SCL Document' : 'Add Document'}
                </h3>
                <p className={`mt-1 text-[11px] ${themeClasses.textSecondary}`}>
                  {isSclDocument
                    ? 'SCL outbound correspondence — record counts are derived from documents.'
                    : 'Monthly correspondence tracking — KPI counts are loaded from the dashboard API.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`rounded-xl px-3 py-2 text-sm font-bold ${themeClasses.buttonSecondary}`}
              >
                Close
              </button>
            </div>
          </div>

          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <p className={`text-[11px] font-semibold ${themeClasses.textMuted}`}>
              Required: month, year, type, category, description, and received date. Delivered date
              is optional for delivery items. Attachments are optional.
            </p>
            {!isEditing && (
              <>
                <div>
                  <label className={labelClass}>Project Name</label>
                  <input type="text" readOnly value={projectName || '—'} className={readOnlyClass} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    {fieldLabel('month', 'Month', true)}
                    <select
                      data-corr-field="month"
                      aria-invalid={Boolean(fieldErrors.month)}
                      value={values.month}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, month: Number(e.target.value) }));
                        clearFieldError('month');
                      }}
                      className={`${inputClass}${fieldErrors.month ? ` ${fieldErrorClass}` : ''}`}
                    >
                      {MONTH_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {fieldMessage('month')}
                  </div>
                  <div>
                    {fieldLabel('year', 'Year', true)}
                    <select
                      data-corr-field="year"
                      aria-invalid={Boolean(fieldErrors.year)}
                      value={values.year}
                      onChange={(e) => {
                        setValues((prev) => ({ ...prev, year: Number(e.target.value) }));
                        clearFieldError('year');
                      }}
                      className={`${inputClass}${fieldErrors.year ? ` ${fieldErrorClass}` : ''}`}
                    >
                      {buildCorrespondenceYearOptions().map((optionYear) => (
                        <option key={optionYear} value={optionYear}>
                          {optionYear}
                        </option>
                      ))}
                    </select>
                    {fieldMessage('year')}
                  </div>
                </div>

                {isSclDocument ? (
                  <div>
                    {fieldLabel('recipientType', 'Recipient', true)}
                    <select
                      data-corr-field="recipientType"
                      aria-invalid={Boolean(fieldErrors.recipientType)}
                      value={values.recipientType}
                      onChange={(e) => {
                        setValues((prev) => ({
                          ...prev,
                          recipientType: e.target.value as CorrespondenceRecipientType,
                        }));
                        clearFieldError('recipientType');
                      }}
                      className={`${inputClass}${fieldErrors.recipientType ? ` ${fieldErrorClass}` : ''}`}
                    >
                      <option value="CLIENT">Client</option>
                      <option value="CONTRACTOR">Contractor</option>
                      <option value="OTHER_AGENCY">Other Agency</option>
                    </select>
                    {fieldMessage('recipientType')}
                  </div>
                ) : (
                  <div>
                    {fieldLabel('correspondenceType', 'Correspondence Type', true)}
                    <select
                      data-corr-field="correspondenceType"
                      aria-invalid={Boolean(fieldErrors.correspondenceType)}
                      value={values.correspondenceType}
                      onChange={(e) => {
                        setValues((prev) => ({
                          ...prev,
                          correspondenceType: e.target.value as CorrespondenceType,
                        }));
                        clearFieldError('correspondenceType');
                      }}
                      className={`${inputClass}${fieldErrors.correspondenceType ? ` ${fieldErrorClass}` : ''}`}
                    >
                      <option value="CLIENT">Client</option>
                      <option value="CONTRACTOR">Contractor</option>
                    </select>
                    {fieldMessage('correspondenceType')}
                  </div>
                )}
              </>
            )}

            {(isEditing && isSclDocument) && (
              <div>
                {fieldLabel('recipientType', 'Recipient', true)}
                <select
                  data-corr-field="recipientType"
                  aria-invalid={Boolean(fieldErrors.recipientType)}
                  value={values.recipientType}
                  onChange={(e) => {
                    setValues((prev) => ({
                      ...prev,
                      recipientType: e.target.value as CorrespondenceRecipientType,
                    }));
                    clearFieldError('recipientType');
                  }}
                  className={`${inputClass}${fieldErrors.recipientType ? ` ${fieldErrorClass}` : ''}`}
                >
                  <option value="CLIENT">Client</option>
                  <option value="CONTRACTOR">Contractor</option>
                  <option value="OTHER_AGENCY">Other Agency</option>
                </select>
                {fieldMessage('recipientType')}
              </div>
            )}

            <div>
              {fieldLabel('correspondenceCategory', 'Correspondence Category', true)}
              <select
                data-corr-field="correspondenceCategory"
                aria-invalid={Boolean(fieldErrors.correspondenceCategory)}
                value={values.correspondenceCategory}
                onChange={(e) =>
                  handleCategoryChange(normalizeCorrespondenceCategory(e.target.value))
                }
                className={`${inputClass}${fieldErrors.correspondenceCategory ? ` ${fieldErrorClass}` : ''}`}
              >
                <option value="DELIVERY">Delivery</option>
                <option value="RECORD">Record</option>
              </select>
              {fieldMessage('correspondenceCategory')}
            </div>

            {!isEditing && !isSclDocument && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  {fieldLabel(
                    'srNo',
                    <>
                      Sr No{' '}
                      <span className={`font-semibold normal-case tracking-normal ${themeClasses.textMuted}`}>
                        Required
                      </span>
                    </>,
                  )}
                  <input
                    type="number"
                    min={1}
                    data-corr-field="srNo"
                    aria-invalid={Boolean(fieldErrors.srNo)}
                    value={values.srNo}
                    onChange={(e) => {
                      setValues((prev) => ({
                        ...prev,
                        srNo: Number(e.target.value) || 1,
                      }));
                      clearFieldError('srNo');
                    }}
                    className={`${inputClass}${fieldErrors.srNo ? ` ${fieldErrorClass}` : ''}`}
                  />
                  {fieldMessage('srNo')}
                </div>
                <div>
                  <label className={labelClass}>Deadline Date</label>
                  <input type="text" readOnly value={deadlineDisplay} className={readOnlyClass} />
                </div>
              </div>
            )}

            <div>
              {fieldLabel('description', 'Description', true)}
              <textarea
                data-corr-field="description"
                aria-invalid={Boolean(fieldErrors.description)}
                value={values.description}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, description: e.target.value }));
                  clearFieldError('description');
                }}
                rows={3}
                placeholder="Enter document details"
                className={`${inputClass}${fieldErrors.description ? ` ${fieldErrorClass}` : ''}`}
              />
              {fieldMessage('description')}
            </div>

            <div className={`grid grid-cols-1 gap-4 ${isDelivery ? 'sm:grid-cols-2' : ''}`}>
              <div>
                {fieldLabel('receivedDate', 'Received Date', true)}
                <input
                  type="date"
                  data-corr-field="receivedDate"
                  aria-invalid={Boolean(fieldErrors.receivedDate)}
                  value={values.receivedDate}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, receivedDate: e.target.value }));
                    clearFieldError('receivedDate');
                    clearFieldError('deliveredDate');
                  }}
                  className={`${inputClass}${fieldErrors.receivedDate ? ` ${fieldErrorClass}` : ''}`}
                />
                {fieldMessage('receivedDate')}
              </div>
              {isDelivery && (
                <div>
                  {fieldLabel(
                    'deliveredDate',
                    <>
                      Delivered Date{' '}
                      <span className={`font-semibold normal-case tracking-normal ${themeClasses.textMuted}`}>
                        Optional
                      </span>
                    </>,
                  )}
                  <input
                    type="date"
                    data-corr-field="deliveredDate"
                    aria-invalid={Boolean(fieldErrors.deliveredDate)}
                    value={values.deliveredDate}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, deliveredDate: e.target.value }));
                      clearFieldError('deliveredDate');
                    }}
                    className={`${inputClass}${fieldErrors.deliveredDate ? ` ${fieldErrorClass}` : ''}`}
                  />
                  {fieldMessage('deliveredDate')}
                </div>
              )}
            </div>

            <CorrespondenceFormAttachments
              documentId={savedDocumentId ?? document?.id}
              pendingFiles={pendingFiles}
              onPendingFilesChange={setPendingFiles}
              onAttachmentsChanged={onAttachmentsChanged}
            />

            {(localError || error) && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-500"
              >
                {localError || error}
              </div>
            )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex-1 rounded-2xl px-4 py-3 font-bold ${themeClasses.buttonSecondary}`}
                >
                  Cancel
                </button>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={saveAndAddAnother}
                    disabled={isSaving}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-blue-600 px-4 py-3 font-bold text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-60 dark:hover:bg-blue-500/10`}
                  >
                    <Icons.Add size={18} />
                    {isSaving ? 'Saving...' : 'Add Another'}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : isEditing ? 'Update Correspondence' : 'Save Document'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default React.memo(CorrespondenceDocumentForm);
