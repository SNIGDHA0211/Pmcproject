import React, { useState } from 'react';
import type { MonthlyScope } from '../types';
import { ModalPortal } from './ModalPortal';
import { Icons } from './Icons';
import { getThemeClasses, useTheme } from '../utils/theme';

export interface QaqcScopeUpdateValues {
  executed_quantity: number;
  status: MonthlyScope['status'];
  description: string;
}

interface QaqcScopeUpdateModalProps {
  scope: MonthlyScope;
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: QaqcScopeUpdateValues) => Promise<boolean> | boolean;
}

export function buildScopeUpdatePayload(
  scope: MonthlyScope,
  values: QaqcScopeUpdateValues,
): Record<string, unknown> {
  return {
    project: scope.project,
    month: scope.month,
    category: scope.category,
    subcategory: scope.subcategory,
    description: values.description,
    unit: scope.unit,
    planned_quantity: scope.planned_quantity,
    section: scope.section,
    location: scope.location,
    start_date: scope.start_date,
    end_date: scope.end_date,
    status: values.status,
    executed_quantity: values.executed_quantity,
    ...(scope.custom_category_name ? { custom_category_name: scope.custom_category_name } : {}),
    ...(scope.custom_subcategory_name ? { custom_subcategory_name: scope.custom_subcategory_name } : {}),
  };
}

const QaqcScopeUpdateModal: React.FC<QaqcScopeUpdateModalProps> = ({
  scope,
  isSaving,
  error,
  onClose,
  onSubmit,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [values, setValues] = useState<QaqcScopeUpdateValues>({
    executed_quantity: scope.executed_quantity ?? 0,
    status: scope.status ?? 'pending',
    description: scope.description ?? '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (values.executed_quantity < 0) {
      setLocalError('Executed quantity cannot be negative.');
      return;
    }
    if (scope.planned_quantity != null && values.executed_quantity > scope.planned_quantity) {
      setLocalError('Executed quantity cannot exceed planned quantity.');
      return;
    }
    setLocalError(null);
    await onSubmit(values);
  };

  const displayError = localError || error;

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[100040] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div
          className={`relative w-full max-w-lg rounded-2xl border shadow-2xl ${themeClasses.glassCard} ${themeClasses.border} p-5 sm:p-6`}
          role="dialog"
          aria-labelledby="qaqc-scope-update-title"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                id="qaqc-scope-update-title"
                className={`text-base font-black uppercase tracking-tight sm:text-lg ${themeClasses.textPrimary}`}
              >
                Update Scope Progress
              </h3>
              <p className={`mt-1 truncate text-xs font-semibold ${themeClasses.textSecondary}`}>
                {scope.project_name} · {scope.category_name} / {scope.subcategory_name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`shrink-0 rounded-lg p-2 transition-colors ${themeClasses.buttonSecondary}`}
              aria-label="Close"
            >
              <Icons.Close size={18} />
            </button>
          </div>

          <div
            className={`mb-4 grid grid-cols-2 gap-2 rounded-xl border px-3 py-2.5 text-xs ${
              isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
            }`}
          >
            <div>
              <span className={themeClasses.textSecondary}>Planned</span>
              <p className={`font-bold tabular-nums ${themeClasses.textPrimary}`}>
                {scope.planned_quantity} {scope.unit}
              </p>
            </div>
            <div>
              <span className={themeClasses.textSecondary}>Location</span>
              <p className={`truncate font-semibold ${themeClasses.textPrimary}`}>{scope.location || '—'}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Executed Quantity ({scope.unit})
              </label>
              <input
                type="number"
                min={0}
                max={scope.planned_quantity}
                step="0.01"
                value={values.executed_quantity}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    executed_quantity: e.target.value === '' ? 0 : Number(e.target.value),
                  }))
                }
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
              />
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Status
              </label>
              <select
                value={values.status}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    status: e.target.value as MonthlyScope['status'],
                  }))
                }
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Remarks
              </label>
              <textarea
                rows={3}
                value={values.description}
                onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Progress notes or observations..."
                className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
              />
            </div>

            {displayError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {displayError}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-wider ${themeClasses.buttonSecondary} ${themeClasses.border}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
              >
                {isSaving ? 'Saving…' : 'Save Progress'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default QaqcScopeUpdateModal;
