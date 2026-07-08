import React, { useState, useEffect } from "react";
import { frequencyChartApi, getApiErrorMessage } from "../services/api";
import type { FrequencyChartRegisterRow } from "../types";
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
  onSaved: () => void;
}

function toN(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
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

export default function FrequencyChartRegisterModal({
  projectName, month, year, editRow, onClose, onSaved,
}: Props) {
  const { isDarkTheme } = useTheme();
  const tc = getThemeClasses(isDarkTheme);
  const isEditing = !!editRow?.id;

  const [values, setValues] = useState<FormValues>({
    month,
    year,
    itemDescription:        String(editRow?.itemDescription  ?? ""),
    typeOfTest:             String(editRow?.typeOfTest        ?? ""),
    unit:                   String(editRow?.unit              ?? ""),
    qtyPreviousBill:        toN(editRow?.qtyPreviousBill),
    qtyThisBill:            toN(editRow?.qtyThisBill),
    fieldLabPreviousBill:   toN(editRow?.fieldLabPreviousBill),
    fieldLabThisBill:       toN(editRow?.fieldLabThisBill),
    thirdPartyPreviousBill: toN(editRow?.thirdPartyPreviousBill),
    thirdPartyThisBill:     toN(editRow?.thirdPartyThisBill),
    remarks:                String(editRow?.remarks           ?? ""),
    activityName:           String(editRow?.activityName      ?? ""),
    contractorName:         String(editRow?.contractorName    ?? ""),
  });

  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => {
    if (editRow) {
      setValues({
        month:                  toN(editRow.month)              || month,
        year:                   toN(editRow.year)               || year,
        itemDescription:        String(editRow.itemDescription  ?? ""),
        typeOfTest:             String(editRow.typeOfTest        ?? ""),
        unit:                   String(editRow.unit              ?? ""),
        qtyPreviousBill:        toN(editRow.qtyPreviousBill),
        qtyThisBill:            toN(editRow.qtyThisBill),
        fieldLabPreviousBill:   toN(editRow.fieldLabPreviousBill),
        fieldLabThisBill:       toN(editRow.fieldLabThisBill),
        thirdPartyPreviousBill: toN(editRow.thirdPartyPreviousBill),
        thirdPartyThisBill:     toN(editRow.thirdPartyThisBill),
        remarks:                String(editRow.remarks           ?? ""),
        activityName:           String(editRow.activityName      ?? ""),
        contractorName:         String(editRow.contractorName    ?? ""),
      });
    }
  }, [editRow, month, year]);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues(prev => ({ ...prev, [key]: value }));
  }

  function numField(key: keyof FormValues, raw: string) {
    const n = raw === "" ? 0 : Number(raw);
    set(key, (Number.isFinite(n) && n >= 0 ? n : 0) as FormValues[typeof key]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);

    if (!values.itemDescription.trim()) return setFormErr("Item description is required.");
    if (!values.typeOfTest.trim())      return setFormErr("Type of test is required.");
    if (!values.unit.trim())            return setFormErr("Unit is required.");

    setSaving(true);
    try {
      if (isEditing && editRow?.id) {
        await frequencyChartApi.updateRegisterRow(editRow.id as number, {
          qtyThisBill:            values.qtyThisBill,
          fieldLabThisBill:       values.fieldLabThisBill,
          thirdPartyThisBill:     values.thirdPartyThisBill,
          remarks:                values.remarks,
          activityName:           values.activityName,
          contractorName:         values.contractorName,
        });
      } else {
        await frequencyChartApi.createRegisterRow({
          projectName,
          month:                  values.month,
          year:                   values.year,
          itemDescription:        values.itemDescription,
          typeOfTest:             values.typeOfTest,
          unit:                   values.unit,
          qtyPreviousBill:        values.qtyPreviousBill,
          qtyThisBill:            values.qtyThisBill,
          fieldLabPreviousBill:   values.fieldLabPreviousBill,
          fieldLabThisBill:       values.fieldLabThisBill,
          thirdPartyPreviousBill: values.thirdPartyPreviousBill,
          thirdPartyThisBill:     values.thirdPartyThisBill,
          remarks:                values.remarks,
          ...(values.activityName   && { activityName:   values.activityName }),
          ...(values.contractorName && { contractorName: values.contractorName }),
        });
      }
      onSaved();
    } catch (err) {
      setFormErr(getApiErrorMessage(err, "Failed to save record"));
    } finally {
      setSaving(false);
    }
  }

  const labelClass = `mb-0.5 block text-[9px] font-bold uppercase tracking-wide ${tc.textSecondary}`;
  const inputClass = `w-full rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors ${tc.input} ${tc.textPrimary}`;
  const disabledClass = "disabled:opacity-60 disabled:cursor-not-allowed";

  const sectionClass = `rounded-xl border p-2.5 sm:p-3 ${
    isDarkTheme ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50/80"
  }`;

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
        <div
          className={`flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:max-w-lg sm:rounded-2xl ${tc.bgPrimary} ${tc.border}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
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
              {/* Period */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={labelClass}>Month</label>
                  <select
                    value={values.month}
                    onChange={e => set("month", Number(e.target.value))}
                    disabled={isEditing}
                    className={`${inputClass} ${disabledClass}`}
                  >
                    {MONTH_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Year</label>
                  <select
                    value={values.year}
                    onChange={e => set("year", Number(e.target.value))}
                    disabled={isEditing}
                    className={`${inputClass} ${disabledClass}`}
                  >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Core info */}
              <div className="space-y-2.5">
                <div>
                  <label className={labelClass}>Item Description *</label>
                  <input
                    type="text"
                    value={values.itemDescription}
                    onChange={e => set("itemDescription", e.target.value)}
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
                      onChange={e => set("typeOfTest", e.target.value)}
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
                      onChange={e => set("unit", e.target.value)}
                      disabled={isEditing}
                      placeholder="Cum, Kg, Nos"
                      className={`${inputClass} ${disabledClass}`}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Bill quantities & tests — compact table */}
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
                        onChange={e => numField(row.prevKey, e.target.value)}
                        disabled={isEditing}
                        className={`${inputClass} text-center tabular-nums ${disabledClass}`}
                      />
                      <input
                        type="number"
                        min="0"
                        step={row.key === "qty" ? "any" : undefined}
                        value={values[row.thisKey]}
                        onChange={e => numField(row.thisKey, e.target.value)}
                        className={`${inputClass} text-center tabular-nums`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Activity Name</label>
                  <input
                    type="text"
                    value={values.activityName}
                    onChange={e => set("activityName", e.target.value)}
                    placeholder="Foundation"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Contractor Name</label>
                  <input
                    type="text"
                    value={values.contractorName}
                    onChange={e => set("contractorName", e.target.value)}
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
                  onChange={e => set("remarks", e.target.value)}
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

            {/* Footer */}
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
