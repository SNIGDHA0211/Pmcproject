import React, { useMemo, useState, useEffect } from "react";
import { frequencyChartApi, getApiErrorMessage } from "../services/api";
import type { FrequencyChartRegisterRow, FrequencyChartTestStatus } from "../types";
import { ModalPortal } from "./ModalPortal";
import { getThemeClasses, useTheme } from "../utils/theme";
import { Icons } from "./Icons";
import {
  extractUserFacingFieldErrors,
  formatUserFacingError,
  simplifyFieldErrorMessage,
} from "../utils/formErrors";

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

const FORM_FIELD_KEYS: (keyof FormValues)[] = [
  "month",
  "year",
  "itemDescription",
  "typeOfTest",
  "unit",
  "qtyPreviousBill",
  "qtyThisBill",
  "fieldLabPreviousBill",
  "fieldLabThisBill",
  "thirdPartyPreviousBill",
  "thirdPartyThisBill",
  "requiredTests",
  "conductedTests",
  "passedTests",
  "remarks",
  "activityName",
  "contractorName",
];

const FORM_FIELD_SET = new Set<string>(FORM_FIELD_KEYS);

function toFormField(field: string): string {
  if (FORM_FIELD_SET.has(field)) return field;
  const camel = field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return FORM_FIELD_SET.has(camel) ? camel : field;
}

function mapApiFieldErrors(err: unknown): Record<string, string> {
  const raw = extractUserFacingFieldErrors(err);
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(raw)) {
    if (key === "non_field_errors" || key === "detail" || key.startsWith("item_")) continue;
    const mapped = toFormField(key);
    if (!FORM_FIELD_SET.has(mapped)) continue;
    out[mapped] = simplifyFieldErrorMessage(mapped, message);
  }
  return out;
}

function validateTestRecordForm(values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.month || values.month < 1 || values.month > 12) {
    errors.month = "Select a month.";
  }
  if (!values.year || values.year < 2000) {
    errors.year = "Select a year.";
  }
  if (!values.itemDescription.trim()) {
    errors.itemDescription = "Item description is required.";
  }
  if (!values.typeOfTest.trim()) {
    errors.typeOfTest = "Type of test is required.";
  }
  if (!values.unit.trim()) {
    errors.unit = "Unit is required.";
  }

  const amounts: (keyof FormValues)[] = [
    "qtyPreviousBill",
    "qtyThisBill",
    "fieldLabPreviousBill",
    "fieldLabThisBill",
    "thirdPartyPreviousBill",
    "thirdPartyThisBill",
    "requiredTests",
    "conductedTests",
    "passedTests",
  ];
  for (const key of amounts) {
    const n = Number(values[key]);
    if (!Number.isFinite(n) || n < 0) {
      errors[key] = "Enter 0 or a positive number.";
    }
  }

  if (values.passedTests > values.conductedTests) {
    errors.passedTests = "Cannot be more than conducted tests.";
  }
  if (values.conductedTests > values.requiredTests) {
    errors.conductedTests = "Cannot be more than required tests.";
  }

  return errors;
}

function focusTestField(field: string) {
  window.requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-test-field="${field}"]`)?.focus();
  });
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
    setFormErr(null);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validateTestRecordForm(values);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormErr("Fix the highlighted fields, then save.");
      const order: (keyof FormValues)[] = [
        "month",
        "year",
        "itemDescription",
        "typeOfTest",
        "unit",
        "requiredTests",
        "conductedTests",
        "passedTests",
      ];
      const first = order.find((key) => nextErrors[key]) ?? Object.keys(nextErrors)[0];
      if (first) focusTestField(first);
      return;
    }

    setFormErr(null);
    setFieldErrors({});
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
        const mapped = mapApiFieldErrors({ response: { data: env } });
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          setFormErr("Fix the highlighted fields, then save.");
          const first = Object.keys(mapped)[0];
          if (first) focusTestField(first);
        } else {
          setFormErr(String(env.message ?? "Unable to save record."));
        }
        return;
      }

      onSaved(
        isEditing ? "Record updated successfully." : "Record created successfully.",
      );
    } catch (err) {
      const mapped = mapApiFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped);
        setFormErr("Fix the highlighted fields, then save.");
        const first = Object.keys(mapped)[0];
        if (first) focusTestField(first);
      } else {
        setFormErr(
          formatUserFacingError(err, {
            fallback: getApiErrorMessage(err, "Unable to save record."),
          }),
        );
      }
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

  const errorTextClass = `mt-0.5 text-[10px] font-semibold ${isDarkTheme ? "text-rose-400" : "text-rose-600"}`;
  const errorLabelClass = isDarkTheme ? "text-rose-400" : "text-rose-600";

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

          <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-4">
              <p className={`text-[10px] font-semibold ${tc.textMuted}`}>
                Required: item description, type of test, unit, and testing summary. Bill
                quantities, activity, contractor, and remarks can stay empty or 0.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`${labelClass} ${fieldErrors.month ? errorLabelClass : ""}`}>
                    Month <span className="text-rose-400">*</span>
                  </label>
                  <select
                    data-test-field="month"
                    aria-invalid={Boolean(fieldErrors.month)}
                    value={values.month}
                    onChange={(e) => set("month", Number(e.target.value))}
                    disabled={isEditing}
                    className={`${inputClass} ${disabledClass} ${fieldErrors.month ? invalidClass : ""}`}
                  >
                    {MONTH_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {fieldErrors.month && <p className={errorTextClass}>{fieldErrors.month}</p>}
                </div>
                <div>
                  <label className={`${labelClass} ${fieldErrors.year ? errorLabelClass : ""}`}>
                    Year <span className="text-rose-400">*</span>
                  </label>
                  <select
                    data-test-field="year"
                    aria-invalid={Boolean(fieldErrors.year)}
                    value={values.year}
                    onChange={(e) => set("year", Number(e.target.value))}
                    disabled={isEditing}
                    className={`${inputClass} ${disabledClass} ${fieldErrors.year ? invalidClass : ""}`}
                  >
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  {fieldErrors.year && <p className={errorTextClass}>{fieldErrors.year}</p>}
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className={`${labelClass} ${fieldErrors.itemDescription ? errorLabelClass : ""}`}>
                    Item Description <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    data-test-field="itemDescription"
                    aria-invalid={Boolean(fieldErrors.itemDescription)}
                    value={values.itemDescription}
                    onChange={(e) => set("itemDescription", e.target.value)}
                    disabled={isEditing}
                    placeholder="e.g. Concrete"
                    className={`${inputClass} ${disabledClass} ${fieldErrors.itemDescription ? invalidClass : ""}`}
                  />
                  {fieldErrors.itemDescription && (
                    <p className={errorTextClass}>{fieldErrors.itemDescription}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={`${labelClass} ${fieldErrors.typeOfTest ? errorLabelClass : ""}`}>
                      Type of Test <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      data-test-field="typeOfTest"
                      aria-invalid={Boolean(fieldErrors.typeOfTest)}
                      value={values.typeOfTest}
                      onChange={(e) => set("typeOfTest", e.target.value)}
                      disabled={isEditing}
                      placeholder="Compressive Strength"
                      className={`${inputClass} ${disabledClass} ${fieldErrors.typeOfTest ? invalidClass : ""}`}
                    />
                    {fieldErrors.typeOfTest && <p className={errorTextClass}>{fieldErrors.typeOfTest}</p>}
                  </div>
                  <div>
                    <label className={`${labelClass} ${fieldErrors.unit ? errorLabelClass : ""}`}>
                      Unit <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      data-test-field="unit"
                      aria-invalid={Boolean(fieldErrors.unit)}
                      value={values.unit}
                      onChange={(e) => set("unit", e.target.value)}
                      disabled={isEditing}
                      placeholder="Cum, Kg, Nos"
                      className={`${inputClass} ${disabledClass} ${fieldErrors.unit ? invalidClass : ""}`}
                    />
                    {fieldErrors.unit && <p className={errorTextClass}>{fieldErrors.unit}</p>}
                  </div>
                </div>
              </div>

              <div className={sectionClass}>
                <p className={`mb-2 text-[9px] font-bold uppercase tracking-wide ${isDarkTheme ? "text-indigo-300" : "text-indigo-700"}`}>
                  Bill Quantities & Tests · optional, use 0 if none
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
                        data-test-field={row.prevKey}
                        aria-invalid={Boolean(fieldErrors[row.prevKey])}
                        value={values[row.prevKey]}
                        onChange={(e) => numField(row.prevKey, e.target.value)}
                        disabled={isEditing}
                        className={`${inputClass} text-center tabular-nums ${disabledClass} ${
                          fieldErrors[row.prevKey] ? invalidClass : ""
                        }`}
                      />
                      <input
                        type="number"
                        min="0"
                        step={row.key === "qty" ? "any" : undefined}
                        data-test-field={row.thisKey}
                        aria-invalid={Boolean(fieldErrors[row.thisKey])}
                        value={values[row.thisKey]}
                        onChange={(e) => numField(row.thisKey, e.target.value)}
                        className={`${inputClass} text-center tabular-nums ${
                          fieldErrors[row.thisKey] ? invalidClass : ""
                        }`}
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
                    <label className={`${labelClass} ${fieldErrors.requiredTests ? errorLabelClass : ""}`}>
                      Required Tests <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      data-test-field="requiredTests"
                      aria-invalid={Boolean(fieldErrors.requiredTests)}
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
                    <label className={`${labelClass} ${fieldErrors.conductedTests ? errorLabelClass : ""}`}>
                      Conducted Tests <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      data-test-field="conductedTests"
                      aria-invalid={Boolean(fieldErrors.conductedTests)}
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
                    <label className={`${labelClass} ${fieldErrors.passedTests ? errorLabelClass : ""}`}>
                      Passed Tests <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      data-test-field="passedTests"
                      aria-invalid={Boolean(fieldErrors.passedTests)}
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
                    <label className={`${labelClass} ${fieldErrors.activityName ? errorLabelClass : ""}`}>
                      Activity Name{" "}
                      <span className={`font-semibold normal-case tracking-normal ${tc.textMuted}`}>Optional</span>
                    </label>
                    <input
                      type="text"
                      data-test-field="activityName"
                      aria-invalid={Boolean(fieldErrors.activityName)}
                      value={values.activityName}
                      onChange={(e) => set("activityName", e.target.value)}
                      placeholder="Foundation"
                      className={`${inputClass} ${fieldErrors.activityName ? invalidClass : ""}`}
                    />
                    {fieldErrors.activityName && <p className={errorTextClass}>{fieldErrors.activityName}</p>}
                </div>
                <div>
                    <label className={`${labelClass} ${fieldErrors.contractorName ? errorLabelClass : ""}`}>
                      Contractor Name{" "}
                      <span className={`font-semibold normal-case tracking-normal ${tc.textMuted}`}>Optional</span>
                    </label>
                    <input
                      type="text"
                      data-test-field="contractorName"
                      aria-invalid={Boolean(fieldErrors.contractorName)}
                      value={values.contractorName}
                      onChange={(e) => set("contractorName", e.target.value)}
                      placeholder="ABC Contractors"
                      className={`${inputClass} ${fieldErrors.contractorName ? invalidClass : ""}`}
                    />
                    {fieldErrors.contractorName && <p className={errorTextClass}>{fieldErrors.contractorName}</p>}
                </div>
              </div>

              <div>
                  <label className={`${labelClass} ${fieldErrors.remarks ? errorLabelClass : ""}`}>
                    Remarks{" "}
                    <span className={`font-semibold normal-case tracking-normal ${tc.textMuted}`}>Optional</span>
                  </label>
                  <input
                    type="text"
                    data-test-field="remarks"
                    aria-invalid={Boolean(fieldErrors.remarks)}
                    value={values.remarks}
                    onChange={(e) => set("remarks", e.target.value)}
                    placeholder="Complied"
                    className={`${inputClass} ${fieldErrors.remarks ? invalidClass : ""}`}
                  />
                  {fieldErrors.remarks && <p className={errorTextClass}>{fieldErrors.remarks}</p>}
                </div>

              {formErr && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400"
                >
                  {formErr}
                </div>
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
