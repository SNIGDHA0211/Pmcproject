import React, { useMemo, useState, useEffect } from "react";
import { frequencyChartApi, getApiErrorMessage } from "../services/api";
import type { FrequencyChartRegisterRow, FrequencyChartTestStatus } from "../types";
import { ModalPortal } from "./ModalPortal";
import { getThemeClasses, useTheme } from "../utils/theme";
import { Icons } from "./Icons";

const MONTH_OPTIONS = [
  { value: 1,  label: "January"   }, { value: 2,  label: "February"  },
  { value: 3,  label: "March"     }, { value: 4,  label: "April"     },
  { value: 5,  label: "May"       }, { value: 6,  label: "June"      },
  { value: 7,  label: "July"      }, { value: 8,  label: "August"    },
  { value: 9,  label: "September" }, { value: 10, label: "October"   },
  { value: 11, label: "November"  }, { value: 12, label: "December"  },
];

interface FormValues {
  month: number;
  year: number;
  itemDescription: string;
  typeOfTest: string;
  unit: string;
  qtyPreviousBill: number;
  qtyThisBill: number;
  fieldLabPreviousBill: number;
  fieldLabThisBill: number;
  thirdPartyPreviousBill: number;
  thirdPartyThisBill: number;
  requiredTests: number;
  conductedTests: number;
  passedTests: number;
  remarks: string;
  activityName: string;
  contractorName: string;
}

interface Props {
  projectName: string;
  month: number;
  year: number;
  editRow: FrequencyChartRegisterRow | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

function toN(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function previewFailedTests(conducted: number, passed: number): number {
  return Math.max(conducted - passed, 0);
}

function previewShortfall(required: number, conducted: number): number {
  return Math.max(required - conducted, 0);
}

function previewStatus(
  shortfall: number,
  failed: number,
): FrequencyChartTestStatus {
  if (shortfall > 0) return "Shortfall";
  if (failed > 0) return "Completed With Failures";
  return "Completed";
}

function statusBadgeClass(status: FrequencyChartTestStatus, isDark: boolean): string {
  if (status === "Completed") {
    return isDark ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-100 text-emerald-800";
  }
  if (status === "Completed With Failures") {
    return isDark ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-800";
  }
  return isDark ? "bg-rose-900/50 text-rose-300" : "bg-red-100 text-red-700";
}

function extractFieldErrors(err: unknown): Record<string, string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== "object") return {};
  const body = data as Record<string, unknown>;
  const errors = (body.errors ?? body) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(errors)) {
    if (key === "success" || key === "message" || key === "detail" || key === "data") continue;
    if (Array.isArray(val)) out[key] = val.map(String).join(", ");
    else if (typeof val === "string") out[key] = val;
  }
  return out;
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - i);

const BILL_ROWS = [
  {
    key: "qty" as const,
    label: "Quantity (bill)",
    prevKey: "qtyPreviousBill" as const,
    thisKey: "qtyThisBill" as const,
  },
  {
    key: "fieldLab" as const,
    label: "Field / Lab tests",
    prevKey: "fieldLabPreviousBill" as const,
    thisKey: "fieldLabThisBill" as const,
  },
  {
    key: "thirdParty" as const,
    label: "Third party tests",
    prevKey: "thirdPartyPreviousBill" as const,
    thisKey: "thirdPartyThisBill" as const,
  },
];

function emptyForm(month: number, year: number, editRow: FrequencyChartRegisterRow | null): FormValues {
  return {
    month: toN(editRow?.month) || month,
    year: toN(editRow?.year) || year,
    itemDescription: String(editRow?.itemDescription ?? ""),
    typeOfTest: String(editRow?.typeOfTest ?? ""),
    unit: String(editRow?.unit ?? ""),
    qtyPreviousBill: toN(editRow?.qtyPreviousBill),
    qtyThisBill: toN(editRow?.qtyThisBill),
    fieldLabPreviousBill: toN(editRow?.fieldLabPreviousBill),
    fieldLabThisBill: toN(editRow?.fieldLabThisBill),
    thirdPartyPreviousBill: toN(editRow?.thirdPartyPreviousBill),
    thirdPartyThisBill: toN(editRow?.thirdPartyThisBill),
    requiredTests: toN(editRow?.requiredTests ?? editRow?.requiredTestsUptoDate),
    conductedTests: toN(editRow?.conductedTests ?? editRow?.totalTestsConducted),
    passedTests: toN(editRow?.passedTests),
    remarks: String(editRow?.remarks ?? ""),
    activityName: String(editRow?.activityName ?? ""),
    contractorName: String(editRow?.contractorName ?? ""),
  };
}

export default function FrequencyChartRegisterModal({
  projectName, month, year, editRow, onClose, onSaved,
}: Props) {
  const { isDarkTheme } = useTheme();
  const tc = getThemeClasses(isDarkTheme);
  const isEditing = !!editRow?.id;

  const [values, setValues] = useState<FormValues>(() => emptyForm(month, year, editRow));
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(emptyForm(month, year, editRow));
    setFormErr(null);
    setFieldErrors({});
  }, [editRow, month, year]);

  const failedPreview = useMemo(
    () => previewFailedTests(values.conductedTests, values.passedTests),
    [values.conductedTests, values.passedTests],
  );
  const shortfallPreview = useMemo(
    () => previewShortfall(values.requiredTests, values.conductedTests),
    [values.requiredTests, values.conductedTests],
  );
  const statusPreview = useMemo(
    () => previewStatus(shortfallPreview, failedPreview),
    [shortfallPreview, failedPreview],
  );

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function numField(key: keyof FormValues, raw: string) {
    const n = raw === "" ? 0 : Number(raw);
    set(key, (Number.isFinite(n) && n >= 0 ? n : 0) as FormValues[typeof key]);
  }

  function validateTestingSummary(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (values.requiredTests < 0) {
      errors.requiredTests = "Required Tests cannot be negative.";
    }
    if (values.conductedTests < 0) {
      errors.conductedTests = "Conducted Tests cannot be negative.";
    }
    if (values.passedTests < 0) {
      errors.passedTests = "Passed Tests cannot be negative.";
    }
    if (values.passedTests > values.conductedTests) {
      errors.passedTests = "Passed Tests cannot be greater than Conducted Tests.";
    }
    if (values.conductedTests > values.requiredTests) {
      errors.conductedTests = "Conducted Tests cannot exceed Required Tests.";
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);

    if (!values.itemDescription.trim()) return setFormErr("Item description is required.");
    if (!values.typeOfTest.trim()) return setFormErr("Type of test is required.");
    if (!values.unit.trim()) return setFormErr("Unit is required.");

    const testingErrors = validateTestingSummary();
    if (Object.keys(testingErrors).length > 0) {
      setFieldErrors(testingErrors);
      setFormErr("Validation failed.");
      return;
    }

    setSaving(true);
    try {
      let response;
      if (isEditing && editRow?.id) {
        response = await frequencyChartApi.updateRegisterRow(editRow.id as number, {
          qtyThisBill: values.qtyThisBill,
          fieldLabThisBill: values.fieldLabThisBill,
          thirdPartyThisBill: values.thirdPartyThisBill,
          requiredTests: values.requiredTests,
          conductedTests: values.conductedTests,
          passedTests: values.passedTests,
          remarks: values.remarks,
          activityName: values.activityName,
          contractorName: values.contractorName,
        });
      } else {
        response = await frequencyChartApi.createRegisterRow({
          projectName,
          month: values.month,
          year: values.year,
          itemDescription: values.itemDescription,
          typeOfTest: values.typeOfTest,
          unit: values.unit,
          qtyPreviousBill: values.qtyPreviousBill,
          qtyThisBill: values.qtyThisBill,
          fieldLabPreviousBill: values.fieldLabPreviousBill,
          fieldLabThisBill: values.fieldLabThisBill,
          thirdPartyPreviousBill: values.thirdPartyPreviousBill,
          thirdPartyThisBill: values.thirdPartyThisBill,
          requiredTests: values.requiredTests,
          conductedTests: values.conductedTests,
          passedTests: values.passedTests,
          remarks: values.remarks,
          ...(values.activityName && { activityName: values.activityName }),
          ...(values.contractorName && { contractorName: values.contractorName }),
        });
      }

      const env = response.data as Record<string, unknown> | undefined;
      if (env && typeof env === "object" && env.success === false) {
        setFormErr(String(env.message ?? "Unable to save record."));
        setFieldErrors(extractFieldErrors({ response: { data: env } }));
        return;
      }

      onSaved(
        isEditing ? "Record updated successfully." : "Record created successfully.",
      );
    } catch (err) {
      const fieldErrs = extractFieldErrors(err);
      setFieldErrors(fieldErrs);
      setFormErr(
        Object.keys(fieldErrs).length
          ? getApiErrorMessage(err, "Validation failed.")
          : getApiErrorMessage(err, "Unable to save record."),
      );
    } finally {
      setSaving(false);
    }
  }

  const labelClass = `mb-0.5 block text-[9px] font-bold uppercase tracking-wide ${tc.textSecondary}`;
  const inputClass = `w-full rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors ${tc.input} ${tc.textPrimary}`;
  const disabledClass = "disabled:opacity-60 disabled:cursor-not-allowed";
  const invalidClass = isDarkTheme
    ? "border border-rose-500/60 ring-1 ring-rose-500/30"
    : "border border-rose-400 ring-1 ring-rose-200";

  const sectionClass = `rounded-xl border p-2.5 sm:p-3 ${
    isDarkTheme ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"
  }`;

  const readOnlyClass = `${inputClass} cursor-not-allowed opacity-80`;

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
        <div
          className={`flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:max-w-lg sm:rounded-2xl ${tc.bgPrimary} ${tc.border}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 ${tc.border} ${isDarkTheme ? "bg-white/5" : "bg-indigo-50/80"}`}>
            <div className="min-w-0">
              <h3 className={`truncate text-sm font-bold ${tc.textPrimary}`}>
                {isEditing ? "Edit Test Record" : "Add Test Record"}
              </h3>
              <p className={`truncate text-[10px] font-medium ${tc.textSecondary}`}>{projectName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`shrink-0 rounded-lg p-1.5 transition-colors ${isDarkTheme ? "text-white/70 hover:bg-white/10" : "text-slate-500 hover:bg-slate-200"}`}
              aria-label="Close"
            >
              <Icons.Close size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={labelClass}>Month</label>
                  <select
                    value={values.month}
                    onChange={(e) => set("month", Number(e.target.value))}
                    disabled={isEditing}
                    className={`${inputClass} ${disabledClass}`}
                  >
                    {MONTH_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Year</label>
                  <select
                    value={values.year}
                    onChange={(e) => set("year", Number(e.target.value))}
                    disabled={isEditing}
                    className={`${inputClass} ${disabledClass}`}
                  >
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className={labelClass}>Item Description *</label>
                  <input
                    type="text"
                    value={values.itemDescription}
                    onChange={(e) => set("itemDescription", e.target.value)}
                    disabled={isEditing}
                    placeholder="e.g. Concrete"
                    className={`${inputClass} ${disabledClass}`}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelClass}>Type of Test *</label>
                    <input
                      type="text"
                      value={values.typeOfTest}
                      onChange={(e) => set("typeOfTest", e.target.value)}
                      disabled={isEditing}
                      placeholder="Compressive Strength"
                      className={`${inputClass} ${disabledClass}`}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Unit *</label>
                    <input
                      type="text"
                      value={values.unit}
                      onChange={(e) => set("unit", e.target.value)}
                      disabled={isEditing}
                      placeholder="Cum, Kg, Nos"
                      className={`${inputClass} ${disabledClass}`}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={sectionClass}>
                <p className={`mb-2 text-[9px] font-bold uppercase tracking-wide ${isDarkTheme ? "text-indigo-300" : "text-indigo-700"}`}>
                  Bill Quantities & Tests
                </p>
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-2 items-center">
                    <span className={`text-[9px] font-bold uppercase ${tc.textSecondary}`} />
                    <span className={`text-center text-[9px] font-bold uppercase ${tc.textSecondary}`}>Prev</span>
                    <span className={`text-center text-[9px] font-bold uppercase ${tc.textSecondary}`}>This</span>
                  </div>
                  {BILL_ROWS.map((row) => (
                    <div key={row.key} className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-2 items-center">
                      <span className={`truncate text-[10px] font-semibold ${tc.textPrimary}`}>{row.label}</span>
                      <input
                        type="number"
                        min="0"
                        step={row.key === "qty" ? "any" : undefined}
                        value={values[row.prevKey]}
                        onChange={(e) => numField(row.prevKey, e.target.value)}
                        disabled={isEditing}
                        className={`${inputClass} text-center tabular-nums ${disabledClass}`}
                      />
                      <input
                        type="number"
                        min="0"
                        step={row.key === "qty" ? "any" : undefined}
                        value={values[row.thisKey]}
                        onChange={(e) => numField(row.thisKey, e.target.value)}
                        className={`${inputClass} text-center tabular-nums`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Testing Summary — new metrics */}
              <div className={sectionClass}>
                <p className={`mb-2 text-[9px] font-bold uppercase tracking-wide ${isDarkTheme ? "text-indigo-300" : "text-indigo-700"}`}>
                  Testing Summary
                </p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Required Tests *</label>
                    <input
                      type="number"
                      min="0"
                      value={values.requiredTests}
                      onChange={(e) => numField("requiredTests", e.target.value)}
                      className={`${inputClass} tabular-nums ${fieldErrors.requiredTests ? invalidClass : ""}`}
                    />
                    {fieldErrors.requiredTests && (
                      <p className={`mt-0.5 text-[10px] font-semibold ${isDarkTheme ? "text-rose-400" : "text-rose-600"}`}>
                        {fieldErrors.requiredTests}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Conducted Tests *</label>
                    <input
                      type="number"
                      min="0"
                      value={values.conductedTests}
                      onChange={(e) => numField("conductedTests", e.target.value)}
                      className={`${inputClass} tabular-nums ${fieldErrors.conductedTests ? invalidClass : ""}`}
                    />
                    {fieldErrors.conductedTests && (
                      <p className={`mt-0.5 text-[10px] font-semibold ${isDarkTheme ? "text-rose-400" : "text-rose-600"}`}>
                        {fieldErrors.conductedTests}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Passed Tests *</label>
                    <input
                      type="number"
                      min="0"
                      value={values.passedTests}
                      onChange={(e) => numField("passedTests", e.target.value)}
                      className={`${inputClass} tabular-nums ${fieldErrors.passedTests ? invalidClass : ""}`}
                    />
                    {fieldErrors.passedTests && (
                      <p className={`mt-0.5 text-[10px] font-semibold ${isDarkTheme ? "text-rose-400" : "text-rose-600"}`}>
                        {fieldErrors.passedTests}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Failed Tests</label>
                    <input
                      type="number"
                      readOnly
                      value={failedPreview}
                      className={`${readOnlyClass} tabular-nums`}
                      aria-label="Failed Tests (read only)"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Shortfall</label>
                    <input
                      type="number"
                      readOnly
                      value={shortfallPreview}
                      className={`${readOnlyClass} tabular-nums`}
                      aria-label="Shortfall (read only)"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Status</label>
                    <div className="flex h-[30px] items-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClass(statusPreview, isDarkTheme)}`}
                      >
                        {statusPreview}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Activity Name</label>
                  <input
                    type="text"
                    value={values.activityName}
                    onChange={(e) => set("activityName", e.target.value)}
                    placeholder="Foundation"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Contractor Name</label>
                  <input
                    type="text"
                    value={values.contractorName}
                    onChange={(e) => set("contractorName", e.target.value)}
                    placeholder="ABC Contractors"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Remarks</label>
                <input
                  type="text"
                  value={values.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                  placeholder="Complied"
                  className={inputClass}
                />
              </div>

              {formErr && (
                <p className={`text-xs font-semibold ${isDarkTheme ? "text-rose-400" : "text-rose-600"}`}>
                  {formErr}
                </p>
              )}
            </div>

            <div className={`flex shrink-0 gap-2 border-t px-4 py-2.5 ${tc.border} ${isDarkTheme ? "bg-white/[0.02]" : "bg-slate-50/50"}`}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${isDarkTheme ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving…" : isEditing ? "Update" : "Create Record"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
