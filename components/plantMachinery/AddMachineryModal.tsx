import React, { useState } from 'react';
import { ModalPortal } from '../ModalPortal';
import { getThemeClasses, useTheme } from '../../utils/theme';

export type AddMachineryFormValues = {
  name: string;
  unit: string;
  category: string;
};

interface AddMachineryModalProps {
  open: boolean;
  isSaving?: boolean;
  error?: string | null;
  initialName?: string;
  onClose: () => void;
  onSave: (values: AddMachineryFormValues) => Promise<boolean> | boolean;
}

const AddMachineryModal: React.FC<AddMachineryModalProps> = ({
  open,
  isSaving = false,
  error,
  initialName = '',
  onClose,
  onSave,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [values, setValues] = useState<AddMachineryFormValues>({
    name: initialName,
    unit: 'No',
    category: 'General',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setValues({
      name: initialName,
      unit: 'No',
      category: 'General',
    });
    setLocalError(null);
  }, [open, initialName]);

  const inputClass = `w-full rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 transition-all border ${
    isDarkTheme
      ? 'bg-slate-800 border-white/10 focus:ring-indigo-500/20 text-slate-200'
      : 'bg-white border-slate-200 focus:ring-indigo-500/10 text-slate-800'
  }`;
  const labelClass = `mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.name.trim()) {
      setLocalError('Machinery name is required.');
      return;
    }
    if (!values.unit.trim()) {
      setLocalError('Unit is required.');
      return;
    }
    if (!values.category.trim()) {
      setLocalError('Category is required.');
      return;
    }
    setLocalError(null);
    const saved = await onSave({
      name: values.name.trim(),
      unit: values.unit.trim(),
      category: values.category.trim(),
    });
    if (saved) onClose();
  };

  if (!open) return null;

  return (
    <ModalPortal open>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && !isSaving && onClose()}
      >
        <div
          className={`w-full max-w-md rounded-[2rem] border p-6 shadow-2xl ${themeClasses.glassCard} ${themeClasses.border}`}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
            Add Machinery
          </h3>
          <p className={`mt-1 text-[11px] font-bold ${themeClasses.textSecondary}`}>
            Create a new machinery type for the site inventory list.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className={labelClass}>Machinery Name</label>
              <input
                type="text"
                value={values.name}
                onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Tower Crane"
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>Unit</label>
              <input
                type="text"
                value={values.unit}
                onChange={(e) => setValues((prev) => ({ ...prev, unit: e.target.value }))}
                className={inputClass}
                placeholder="e.g. No"
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <input
                type="text"
                value={values.category}
                onChange={(e) => setValues((prev) => ({ ...prev, category: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Lifting"
              />
            </div>

            {(localError || error) && (
              <p className="text-sm font-bold text-rose-500">{localError || error}</p>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold ${themeClasses.buttonSecondary} disabled:opacity-60`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg disabled:opacity-60 ${themeClasses.buttonPrimary}`}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default React.memo(AddMachineryModal);
