import React, { useState, useEffect } from 'react';
import { Project, MonthlyScope, MonthlyScopeCategory, MonthlyScopeSubcategory } from '../types';
import { Icons } from './Icons';

interface ScopeFormProps {
  scope?: MonthlyScope | null;
  projects: Project[];
  categories: MonthlyScopeCategory[];
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
  themeClasses: any;
  // Optional refs passed only during tour for safe highlighting (typed to match actual attached elements)
  projectRef?: React.RefObject<HTMLSelectElement | null>;
  monthRef?: React.RefObject<HTMLInputElement | null>;
  categoryRef?: React.Ref<any>;
  subcategoryRef?: React.RefObject<HTMLDivElement | null>;
  descriptionRef?: React.RefObject<HTMLTextAreaElement | null>;
  unitRef?: React.RefObject<HTMLDivElement | null>;
  quantityRef?: React.Ref<any>;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
  locationRef?: React.RefObject<HTMLDivElement | null>;
  startDateRef?: React.RefObject<HTMLDivElement | null>;
  endDateRef?: React.RefObject<HTMLDivElement | null>;
  saveRef?: React.RefObject<HTMLButtonElement | null>;
}

const FIELD_LABELS: Record<string, string> = {
  project: 'Project',
  month: 'Month',
  category: 'Category',
  subcategory: 'Subcategory',
  description: 'Description',
  unit: 'Unit',
  planned_quantity: 'Planned Quantity',
  section: 'Section',
  location: 'Location',
  start_date: 'Start Date',
  end_date: 'End Date',
  status: 'Status',
  custom_category_name: 'Custom Category Name',
  custom_subcategory_name: 'Custom Subcategory Name',
  general: 'Form',
};

/** Map API / axios validation payloads into field -> message for the form UI. */
function parseScopeApiErrors(error: unknown): Record<string, string> {
  const mapped: Record<string, string> = {};
  const data = (error as { response?: { data?: unknown } })?.response?.data;

  if (!data || typeof data !== 'object') {
    mapped.general = 'Unable to save. Please check the form and try again.';
    return mapped;
  }

  const body = data as Record<string, unknown>;

  if (typeof body.message === 'string' && body.message.trim()) {
    mapped.general = body.message.trim();
  } else if (typeof body.detail === 'string' && body.detail.trim()) {
    mapped.general = body.detail.trim();
  }

  const errorsList = body.errors;
  if (Array.isArray(errorsList)) {
    for (const item of errorsList) {
      if (!item || typeof item !== 'object') continue;
      const row = item as { field?: unknown; message?: unknown };
      const field = String(row.field ?? '').trim();
      const message = String(row.message ?? '').trim();
      if (field && message) mapped[field] = message;
    }
  }

  // Django-style { field: ["msg"] } or { field: "msg" }
  for (const [key, value] of Object.entries(body)) {
    if (key === 'success' || key === 'message' || key === 'detail' || key === 'errors') continue;
    if (mapped[key]) continue;
    if (typeof value === 'string' && value.trim()) {
      mapped[key] = value.trim();
    } else if (Array.isArray(value) && value.length > 0) {
      mapped[key] = String(value[0] ?? '').trim() || 'Please provide a value.';
    }
  }

  if (!mapped.general && Object.keys(mapped).length > 0) {
    const missing = Object.keys(mapped)
      .filter((k) => k !== 'general')
      .map((k) => FIELD_LABELS[k] || k)
      .join(', ');
    mapped.general = missing
      ? `Please fill the required fields: ${missing}.`
      : 'Please correct the highlighted fields.';
  }

  if (Object.keys(mapped).length === 0) {
    mapped.general = 'Unable to save. Please check the form and try again.';
  }

  return mapped;
}

const ScopeForm: React.FC<ScopeFormProps> = ({
  scope,
  projects,
  categories,
  onSubmit,
  onClose,
  themeClasses,
  projectRef,
  monthRef,
  categoryRef,
  subcategoryRef,
  descriptionRef,
  unitRef,
  quantityRef,
  sectionRef,
  locationRef,
  startDateRef,
  endDateRef,
  saveRef,
}) => {
  const [formData, setFormData] = useState({
    project: scope?.project || (projects.length === 1 ? projects[0].id : ''),
    month: scope?.month ? scope.month.substring(0, 7) : new Date().toISOString().substring(0, 7),
    category: scope?.category || '',
    subcategory: scope?.subcategory || '',
    description: scope?.description || '',
    unit: scope?.unit || '',
    planned_quantity: scope?.planned_quantity || '',
    section: scope?.section || '',
    location: scope?.location || '',
    start_date: scope?.start_date ? scope.start_date.substring(0, 10) : '',
    end_date: scope?.end_date ? scope.end_date.substring(0, 10) : '',
    status: scope?.status || 'pending',
    custom_category_name: scope?.custom_category_name || '',
    custom_subcategory_name: scope?.custom_subcategory_name || '',
  });

  // When only one assigned project is available, default it for create.
  useEffect(() => {
    if (scope) return;
    if (projects.length !== 1) return;
    const onlyId = String(projects[0].id);
    setFormData((prev) =>
      String(prev.project) === onlyId ? prev : { ...prev, project: onlyId },
    );
  }, [projects, scope]);

  const [subcategories, setSubcategories] = useState<MonthlyScopeSubcategory[]>([]);

  const getSubcategoriesForCategory = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.subcategories || [];
  };

  useEffect(() => {
    if (scope && categories.length > 0) {
      const subs = getSubcategoriesForCategory(Number(scope.category));
      setSubcategories(subs);
    }
  }, [scope, categories]);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (formData.category) {
      const categoryId = Number(formData.category);
      const subs = getSubcategoriesForCategory(categoryId);
      setSubcategories(subs);
    } else {
      setSubcategories([]);
    }
  }, [formData.category, categories]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (categories.length === 0) {
      newErrors.general = 'Categories are still loading. Please wait.';
    }

    if (!formData.project) {
      newErrors.project = 'Please select a project.';
    }
    if (!formData.month) {
      newErrors.month = 'Please select a month.';
    }
    if (!formData.category) {
      newErrors.category = 'Please select a category.';
    }
    if (!formData.subcategory) {
      newErrors.subcategory = 'Please select a subcategory.';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Please enter the start date.';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'Please enter the end date.';
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) {
        newErrors.end_date = 'End date cannot be before start date.';
      }
    }

    const selectedCategory = categories.find((c) => c.id === Number(formData.category));
    if (selectedCategory?.name === 'Other' && !String(formData.custom_category_name).trim()) {
      newErrors.custom_category_name = 'Please enter a custom category name.';
    }

    const selectedSubcategory = subcategories.find((s) => s.id === Number(formData.subcategory));
    if (selectedSubcategory?.name === 'Other' && !String(formData.custom_subcategory_name).trim()) {
      newErrors.custom_subcategory_name = 'Please enter a custom subcategory name.';
    }

    if (Object.keys(newErrors).length > 0 && !newErrors.general) {
      const missing = Object.keys(newErrors)
        .map((k) => FIELD_LABELS[k] || k)
        .join(', ');
      newErrors.general = `Please fill the required fields: ${missing}.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'category') {
        next.subcategory = '';
        next.custom_subcategory_name = '';
      }
      if (field === 'subcategory') {
        next.custom_subcategory_name = '';
      }
      return next;
    });

    setErrors((prev) => {
      if (!prev[field] && !prev.general) return prev;
      const next = { ...prev, [field]: '' };
      if (field === 'category') next.subcategory = '';
      if (next.general) next.general = '';
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const payload = {
        ...formData,
        project: formData.project ? Number(formData.project) : null,
        category: formData.category ? Number(formData.category) : null,
        subcategory: formData.subcategory ? Number(formData.subcategory) : null,
        planned_quantity: formData.planned_quantity ? Number(formData.planned_quantity) : null,
        month: formData.month ? formData.month + '-01' : null,
      };

      await onSubmit(payload);
    } catch (error: unknown) {
      console.error('Form submission failed:', error);
      setErrors(parseScopeApiErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === Number(formData.category));
  const selectedSubcategory = subcategories.find((s) => s.id === Number(formData.subcategory));

  const fieldErrorList = Object.entries(errors).filter(
    ([key, msg]) => key !== 'general' && Boolean(msg),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${themeClasses.glassCard} ${themeClasses.border} p-6`}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-lg font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
            {scope ? 'Edit Monthly Scope' : 'Create Monthly Scope'}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${themeClasses.buttonSecondary}`}
          >
            <Icons.Close size={20} />
          </button>
        </div>

        {(errors.general || fieldErrorList.length > 0) && (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
            <p className="font-bold">
              {errors.general || 'Please correct the highlighted fields.'}
            </p>
            {fieldErrorList.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold">
                {fieldErrorList.map(([field, message]) => (
                  <li key={field}>
                    <span className="font-black">{FIELD_LABELS[field] || field}:</span> {message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Project <span className="text-rose-500">*</span>
              </label>
              <select
                ref={projectRef}
                data-tour="form-project"
                value={formData.project}
                onChange={(e) => handleInputChange('project', e.target.value)}
                disabled={!scope && projects.length === 1}
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.project ? 'border-rose-500' : ''}`}
              >
                {projects.length !== 1 && <option value="">Select Project</option>}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              {errors.project && (
                <p className="text-xs font-semibold text-rose-500">{errors.project}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Month <span className="text-rose-500">*</span>
              </label>
              <input
                ref={monthRef}
                data-tour="form-month"
                type="month"
                value={formData.month}
                onChange={(e) => handleInputChange('month', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.month ? 'border-rose-500' : ''}`}
              />
              {errors.month && (
                <p className="text-xs font-semibold text-rose-500">{errors.month}</p>
              )}
            </div>

            <div ref={categoryRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.category ? 'border-rose-500' : ''}`}
              >
                <option value="">
                  {categories.length === 0 ? 'Loading categories...' : 'Select Category'}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className={`text-xs ${themeClasses.textSecondary}`}>No categories found</p>
              )}
              {errors.category && (
                <p className="text-xs font-semibold text-rose-500">{errors.category}</p>
              )}
            </div>

            {selectedCategory?.name === 'Other' && (
              <div className="space-y-2">
                <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Custom Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.custom_category_name}
                  onChange={(e) => handleInputChange('custom_category_name', e.target.value)}
                  placeholder="Enter custom category name"
                  className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.custom_category_name ? 'border-rose-500' : ''}`}
                />
                {errors.custom_category_name && (
                  <p className="text-xs font-semibold text-rose-500">{errors.custom_category_name}</p>
                )}
              </div>
            )}

            <div ref={subcategoryRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Subcategory <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.subcategory}
                onChange={(e) => handleInputChange('subcategory', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.subcategory ? 'border-rose-500' : ''}`}
              >
                <option value="">
                  {!formData.category
                    ? 'Select category first'
                    : subcategories.length === 0
                      ? 'No subcategories available'
                      : 'Select Subcategory'}
                </option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
              {errors.subcategory && (
                <p className="text-xs font-semibold text-rose-500">{errors.subcategory}</p>
              )}
            </div>

            {selectedSubcategory?.name === 'Other' && (
              <div className="space-y-2">
                <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Custom Subcategory Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.custom_subcategory_name}
                  onChange={(e) => handleInputChange('custom_subcategory_name', e.target.value)}
                  placeholder="Enter custom subcategory name"
                  className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.custom_subcategory_name ? 'border-rose-500' : ''}`}
                />
                {errors.custom_subcategory_name && (
                  <p className="text-xs font-semibold text-rose-500">{errors.custom_subcategory_name}</p>
                )}
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Description
              </label>
              <textarea
                ref={descriptionRef}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.description ? 'border-rose-500' : ''}`}
              />
              {errors.description && (
                <p className="text-xs font-semibold text-rose-500">{errors.description}</p>
              )}
            </div>

            <div ref={unitRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Unit
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                placeholder="e.g., Nos, Sq.m, Cu.m"
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.unit ? 'border-rose-500' : ''}`}
              />
              {errors.unit && <p className="text-xs font-semibold text-rose-500">{errors.unit}</p>}
            </div>

            <div ref={quantityRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Planned Quantity
              </label>
              <input
                type="number"
                data-tour="form-planned-quantity"
                value={formData.planned_quantity}
                onChange={(e) => handleInputChange('planned_quantity', e.target.value)}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.planned_quantity ? 'border-rose-500' : ''}`}
              />
              {errors.planned_quantity && (
                <p className="text-xs font-semibold text-rose-500">{errors.planned_quantity}</p>
              )}
            </div>

            <div ref={sectionRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Section
              </label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => handleInputChange('section', e.target.value)}
                placeholder="e.g., Block A, Phase 2"
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.section ? 'border-rose-500' : ''}`}
              />
              {errors.section && (
                <p className="text-xs font-semibold text-rose-500">{errors.section}</p>
              )}
            </div>

            <div ref={locationRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., North Zone, Tower 3"
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.location ? 'border-rose-500' : ''}`}
              />
              {errors.location && (
                <p className="text-xs font-semibold text-rose-500">{errors.location}</p>
              )}
            </div>

            <div ref={startDateRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.start_date ? 'border-rose-500' : ''}`}
              />
              {errors.start_date && (
                <p className="text-xs font-semibold text-rose-500">{errors.start_date}</p>
              )}
            </div>

            <div ref={endDateRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.end_date ? 'border-rose-500' : ''}`}
              />
              {errors.end_date && (
                <p className="text-xs font-semibold text-rose-500">{errors.end_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.status ? 'border-rose-500' : ''}`}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              {errors.status && (
                <p className="text-xs font-semibold text-rose-500">{errors.status}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 border rounded-xl text-sm font-bold transition-all ${themeClasses.buttonSecondary} ${themeClasses.border}`}
            >
              Cancel
            </button>
            <button
              ref={saveRef}
              data-tour="form-submit"
              type="submit"
              disabled={submitting || categories.length === 0}
              className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${themeClasses.buttonPrimary}`}
            >
              {submitting
                ? 'Saving...'
                : categories.length === 0
                  ? 'Loading...'
                  : scope
                    ? 'Update Scope'
                    : 'Create Scope'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScopeForm;
