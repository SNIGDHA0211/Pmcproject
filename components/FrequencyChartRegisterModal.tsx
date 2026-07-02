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

  // Sync if editRow changes while modal is open
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
  }, [editRow]);

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
        // PATCH — only send editable fields
        await frequencyChartApi.updateRegisterRow(editRow.id as number, {
          qtyThisBill:            values.qtyThisBill,
          fieldLabThisBill:       values.fieldLabThisBill,
          thirdPartyThisBill:     values.thirdPartyThisBill,
          remarks:                values.remarks,
          activityName:           values.activityName,
          contractorName:         values.contractorName,
        });
      } else {
        // POST — create new row
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

  const labelClass = `mb-1 block text-[10px] font-black uppercase tracking-widest ${tc.textSecondary}`;
  const inputClass = `w-full rounded-2xl px-4 py-2.5 text-sm font-medium outline-none transition-colors ${tc.input} ${tc.textPrimary}`;

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[250] flex items-start sm:items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto">
        <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl my-4 ${tc.bgPrimary} ${tc.border}`}>

          {/* Modal Header */}
          <div className={`flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b ${tc.border} ${isDarkTheme ? "bg-white/5" : "bg-indigo-50"}`}>
            <div>
              <h3 className={`text-lg font-black uppercase tracking-tight ${tc.textPrimary}`}>
                {isEditing ? "Edit Test Record" : "Add Test Record"}
              </h3>
              <p className={`mt-0.5 text-[11px] font-medium ${tc.textSecondary}`}>{projectName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl p-2 transition-colors ${isDarkTheme ? "hover:bg-white/10 text-white/70" : "hover:bg-slate-200 text-slate-500"}`}
              aria-label="Close"
            >
              <Icons.Close size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-5 space-y-5">

            {/* Period — disabled in edit mode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Month</label>
                <select
                  value={values.month}
                  onChange={e => set("month", Number(e.target.value))}
                  disabled={isEditing}
                  className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
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
                  className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Core test info — only editable on create */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Item Description *</label>
                <input
                  type="text"
                  value={values.itemDescription}
                  onChange={e => set("itemDescription", e.target.value)}
                  disabled={isEditing}
                  placeholder="e.g. Concrete"
                  className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Type of Test *</label>
                <input
                  type="text"
                  value={values.typeOfTest}
                  onChange={e => set("typeOfTest", e.target.value)}
                  disabled={isEditing}
                  placeholder="e.g. Compressive Strength"
                  className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Unit *</label>
              <input
                type="text"
                value={values.unit}
                onChange={e => set("unit", e.target.value)}
                disabled={isEditing}
                placeholder="e.g. Cum, Kg, Nos"
                className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                required
              />
            </div>

            {/* Quantities */}
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkTheme ? "text-indigo-400" : "text-indigo-600"}`}>
                Quantity (as per bill)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Previous Bill Qty</label>
                  <input type="number" min="0" step="any"
                    value={values.qtyPreviousBill}
                    onChange={e => numField("qtyPreviousBill", e.target.value)}
                    disabled={isEditing}
                    className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                </div>
                <div>
                  <label className={labelClass}>This Bill Qty</label>
                  <input type="number" min="0" step="any"
                    value={values.qtyThisBill}
                    onChange={e => numField("qtyThisBill", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Field / Lab tests */}
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkTheme ? "text-emerald-400" : "text-emerald-700"}`}>
                Field / Lab Tests Conducted
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Previous Bill</label>
                  <input type="number" min="0"
                    value={values.fieldLabPreviousBill}
                    onChange={e => numField("fieldLabPreviousBill", e.target.value)}
                    disabled={isEditing}
                    className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                </div>
                <div>
                  <label className={labelClass}>This Bill</label>
                  <input type="number" min="0"
                    value={values.fieldLabThisBill}
                    onChange={e => numField("fieldLabThisBill", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Third party tests */}
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkTheme ? "text-purple-400" : "text-purple-700"}`}>
                Third Party Tests Conducted
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Previous Bill</label>
                  <input type="number" min="0"
                    value={values.thirdPartyPreviousBill}
                    onChange={e => numField("thirdPartyPreviousBill", e.target.value)}
                    disabled={isEditing}
                    className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                </div>
                <div>
                  <label className={labelClass}>This Bill</label>
                  <input type="number" min="0"
                    value={values.thirdPartyThisBill}
                    onChange={e => numField("thirdPartyThisBill", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Activity Name</label>
                <input type="text"
                  value={values.activityName}
                  onChange={e => set("activityName", e.target.value)}
                  placeholder="e.g. Foundation"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contractor Name</label>
                <input type="text"
                  value={values.contractorName}
                  onChange={e => set("contractorName", e.target.value)}
                  placeholder="e.g. ABC Contractors"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Remarks</label>
              <input type="text"
                value={values.remarks}
                onChange={e => set("remarks", e.target.value)}
                placeholder="e.g. Complied"
                className={inputClass}
              />
            </div>

            {/* Error */}
            {formErr && (
              <p className={`text-sm font-bold ${isDarkTheme ? "text-rose-400" : "text-rose-600"}`}>
                {formErr}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${isDarkTheme ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving…" : isEditing ? "Update Record" : "Create Record"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
