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
  validateCorrespondenceDocumentInput,
} from '../utils/correspondence';
import CorrespondenceFormAttachments, {
  uploadCorrespondencePendingAttachments,
} from './CorrespondenceFormAttachments';
import { getThemeClasses, useTheme } from '../utils/theme';

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [savedDocumentId, setSavedDocumentId] = useState<string | number | null>(document?.id ?? null);

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
    setLocalError(null);
  };

  const persist = async (closeOnSuccess: boolean) => {
    const validation = validateCorrespondenceDocumentInput(values);
    if (validation) {
      setLocalError(validation);
      return;
    }
    setLocalError(null);
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

          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {!isEditing && (
              <>
                <div>
                  <label className={labelClass}>Project Name</label>
                  <input type="text" readOnly value={projectName || '—'} className={readOnlyClass} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      Month <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={values.month}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, month: Number(e.target.value) }))
                      }
                      className={inputClass}
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
                    <label className={labelClass}>
                      Year <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={values.year}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, year: Number(e.target.value) }))
                      }
                      className={inputClass}
                      required
                    >
                      {buildCorrespondenceYearOptions().map((optionYear) => (
                        <option key={optionYear} value={optionYear}>
                          {optionYear}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isSclDocument ? (
                  <div>
                    <label className={labelClass}>
                      Recipient <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={values.recipientType}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          recipientType: e.target.value as CorrespondenceRecipientType,
                        }))
                      }
                      className={inputClass}
                      required
                    >
                      <option value="CLIENT">Client</option>
                      <option value="CONTRACTOR">Contractor</option>
                      <option value="OTHER_AGENCY">Other Agency</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className={labelClass}>
                      Correspondence Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={values.correspondenceType}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          correspondenceType: e.target.value as CorrespondenceType,
                        }))
                      }
                      className={inputClass}
                      required
                    >
                      <option value="CLIENT">Client</option>
                      <option value="CONTRACTOR">Contractor</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {(isEditing && isSclDocument) && (
              <div>
                <label className={labelClass}>
                  Recipient <span className="text-rose-500">*</span>
                </label>
                <select
                  value={values.recipientType}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      recipientType: e.target.value as CorrespondenceRecipientType,
                    }))
                  }
                  className={inputClass}
                  required
                >
                  <option value="CLIENT">Client</option>
                  <option value="CONTRACTOR">Contractor</option>
                  <option value="OTHER_AGENCY">Other Agency</option>
                </select>
              </div>
            )}

            <div>
              <label className={labelClass}>
                Correspondence Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={values.correspondenceCategory}
                onChange={(e) =>
                  handleCategoryChange(normalizeCorrespondenceCategory(e.target.value))
                }
                className={inputClass}
                required
              >
                <option value="DELIVERY">Delivery</option>
                <option value="RECORD">Record</option>
              </select>
            </div>

            {!isEditing && !isSclDocument && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Sr No</label>
                  <input
                    type="number"
                    min={1}
                    value={values.srNo}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        srNo: Number(e.target.value) || 1,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Deadline Date</label>
                  <input type="text" readOnly value={deadlineDisplay} className={readOnlyClass} />
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={values.description}
                onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className={inputClass}
                required
              />
            </div>

            <div className={`grid grid-cols-1 gap-4 ${isDelivery ? 'sm:grid-cols-2' : ''}`}>
              <div>
                <label className={labelClass}>
                  Received Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={values.receivedDate}
                  onChange={(e) => setValues((prev) => ({ ...prev, receivedDate: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>
              {isDelivery && (
                <div>
                  <label className={labelClass}>Delivered Date</label>
                  <input
                    type="date"
                    value={values.deliveredDate}
                    onChange={(e) => setValues((prev) => ({ ...prev, deliveredDate: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            <CorrespondenceFormAttachments
              documentId={savedDocumentId ?? document?.id}
              pendingFiles={pendingFiles}
              onPendingFilesChange={setPendingFiles}
              onAttachmentsChanged={onAttachmentsChanged}
            />

            {(localError || error) && <p className="text-sm font-bold text-rose-500">{localError || error}</p>}
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
