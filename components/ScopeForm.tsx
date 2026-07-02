import React, { useState, useEffect } from 'react';
import { Project, MonthlyScope, MonthlyScopeCategory, MonthlyScopeSubcategory } from '../types';
import { monthlyScopeApi } from '../services/api';
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
  saveRef
}) => {
  const [formData, setFormData] = useState({
    project: scope?.project || '',
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
    custom_subcategory_name: scope?.custom_subcategory_name || ''
  });

  // Initialize subcategories when editing
  useEffect(() => {
    if (scope && categories.length > 0) {
      console.log('Initializing form for edit mode with scope:', scope);
      const subs = getSubcategoriesForCategory(Number(scope.category));
      console.log('Setting initial subcategories for edit:', subs);
      setSubcategories(subs);
    }
  }, [scope, categories]);

  const [subcategories, setSubcategories] = useState<MonthlyScopeSubcategory[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Get subcategories from nested categories data instead of separate API call
  const getSubcategoriesForCategory = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.subcategories || [];
  };

  // Debug: Log when categories prop changes
  useEffect(() => {
    console.log('ScopeForm received categories:', categories);
  }, [categories]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (formData.category) {
      const categoryId = Number(formData.category);
      console.log('Category changed to:', categoryId);
      const subs = getSubcategoriesForCategory(categoryId);
      console.log('Subcategories for category:', subs);
      setSubcategories(subs);
    } else {
      setSubcategories([]);
    }
  }, [formData.category, categories]);

  // Removed fetchSubcategories as we're using nested data

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (categories.length === 0) {
      newErrors.general = 'Categories are still loading. Please wait.';
    }

    // Only validate date logic - all other fields are optional
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) {
        newErrors.end_date = 'End date cannot be before start date';
      }
    }

    // Only require custom names when "Other" is selected
    const selectedCategory = categories.find(c => c.id === Number(formData.category));
    if (selectedCategory?.name === 'Other' && !formData.custom_category_name) {
      newErrors.custom_category_name = 'Custom category name is required';
    }

    const selectedSubcategory = subcategories.find(s => s.id === Number(formData.subcategory));
    if (selectedSubcategory?.name === 'Other' && !formData.custom_subcategory_name) {
      newErrors.custom_subcategory_name = 'Custom subcategory name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear subcategory when category changes
    if (field === 'category') {
      setFormData(prev => ({ ...prev, subcategory: '', custom_subcategory_name: '' }));
    }

    // Clear custom names when selection changes
    if (field === 'subcategory') {
      setFormData(prev => ({ ...prev, custom_subcategory_name: '' }));
    }

    // Clear errors for the field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        project: formData.project ? Number(formData.project) : null,
        category: formData.category ? Number(formData.category) : null,
        subcategory: formData.subcategory ? Number(formData.subcategory) : null,
        planned_quantity: formData.planned_quantity ? Number(formData.planned_quantity) : null,
        month: formData.month ? formData.month + '-01' : null // Convert to full date
      };

      await onSubmit(payload);
    } catch (error: any) {
      console.error('Form submission failed:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === Number(formData.category));
  const selectedSubcategory = subcategories.find(s => s.id === Number(formData.subcategory));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${themeClasses.glassCard} ${themeClasses.border} p-6`}>
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

        {errors.general && (
          <div className="mb-6 p-4 bg-amber-500/10 text-amber-400 text-sm rounded-xl border border-amber-500/30">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project */}
            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Project
              </label>
               <select
                 ref={projectRef}
                 data-tour="form-project"
                 value={formData.project}
                 onChange={(e) => handleInputChange('project', e.target.value)}
                 className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.project ? 'border-rose-500' : ''}`}
               >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              {errors.project && <p className="text-xs text-rose-500">{errors.project}</p>}
            </div>

            {/* Month */}
            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Month
              </label>
               <input
                 ref={monthRef}
                 data-tour="form-month"
                 type="month"
                 value={formData.month}
                 onChange={(e) => handleInputChange('month', e.target.value)}
                 className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.month ? 'border-rose-500' : ''}`}
               />
              {errors.month && <p className="text-xs text-rose-500">{errors.month}</p>}
            </div>

            {/* Category */}
            <div ref={categoryRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => {
                  console.log('Category selected:', e.target.value);
                  handleInputChange('category', e.target.value);
                }}
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
              {errors.category && <p className="text-xs text-rose-500">{errors.category}</p>}
            </div>

            {/* Custom Category Name */}
            {selectedCategory?.name === 'Other' && (
              <div className="space-y-2">
                <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Custom Category Name
                </label>
                <input
                  type="text"
                  value={formData.custom_category_name}
                  onChange={(e) => handleInputChange('custom_category_name', e.target.value)}
                  placeholder="Enter custom category name"
                  className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.custom_category_name ? 'border-rose-500' : ''}`}
                />
                {errors.custom_category_name && <p className="text-xs text-rose-500">{errors.custom_category_name}</p>}
              </div>
            )}

            {/* Subcategory */}
            <div ref={subcategoryRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Subcategory
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
                      : 'Select Subcategory'
                  }
                </option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
              {errors.subcategory && <p className="text-xs text-rose-500">{errors.subcategory}</p>}
            </div>

            {/* Custom Subcategory Name */}
            {selectedSubcategory?.name === 'Other' && (
              <div className="space-y-2">
                <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Custom Subcategory Name
                </label>
                <input
                  type="text"
                  value={formData.custom_subcategory_name}
                  onChange={(e) => handleInputChange('custom_subcategory_name', e.target.value)}
                  placeholder="Enter custom subcategory name"
                  className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.custom_subcategory_name ? 'border-rose-500' : ''}`}
                />
                {errors.custom_subcategory_name && <p className="text-xs text-rose-500">{errors.custom_subcategory_name}</p>}
              </div>
            )}

            {/* Description */}
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
              {errors.description && <p className="text-xs text-rose-500">{errors.description}</p>}
            </div>

            {/* Unit */}
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
              {errors.unit && <p className="text-xs text-rose-500">{errors.unit}</p>}
            </div>

            {/* Planned Quantity */}
            <div ref={quantityRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Planned Quantity
              </label>
              <input
                type="number"
                value={formData.planned_quantity}
                onChange={(e) => handleInputChange('planned_quantity', e.target.value)}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.planned_quantity ? 'border-rose-500' : ''}`}
              />
              {errors.planned_quantity && <p className="text-xs text-rose-500">{errors.planned_quantity}</p>}
            </div>

            {/* Section */}
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
              {errors.section && <p className="text-xs text-rose-500">{errors.section}</p>}
            </div>

            {/* Location */}
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
              {errors.location && <p className="text-xs text-rose-500">{errors.location}</p>}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., P42 to A2 Ramp"
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.location ? 'border-rose-500' : ''}`}
              />
              {errors.location && <p className="text-xs text-rose-500">{errors.location}</p>}
            </div>

            {/* Start Date */}
            <div ref={startDateRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.start_date ? 'border-rose-500' : ''}`}
              />
              {errors.start_date && <p className="text-xs text-rose-500">{errors.start_date}</p>}
            </div>

            {/* End Date */}
            <div ref={endDateRef} className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.end_date ? 'border-rose-500' : ''}`}
              />
              {errors.end_date && <p className="text-xs text-rose-500">{errors.end_date}</p>}
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                End Date
              </label>
               <input
                 ref={quantityRef}
                 data-tour="form-planned-quantity"
                 type="number"
                 value={formData.planned_quantity}
                 onChange={(e) => handleInputChange('planned_quantity', e.target.value)}
                 className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.planned_quantity ? 'border-rose-500' : ''}`}
               />
              {errors.end_date && <p className="text-xs text-rose-500">{errors.end_date}</p>}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Status
              </label>
               <select
                 ref={categoryRef}
                 data-tour="form-category"
                 value={formData.category}
                 onChange={(e) => handleInputChange('category', e.target.value)}
                 className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition-all ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${errors.category ? 'border-rose-500' : ''}`}
               >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
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
                disabled={submitting}
                className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${themeClasses.buttonPrimary}`}
              >
              {submitting ? 'Saving...' : categories.length === 0 ? 'Loading...' : scope ? 'Update Scope' : 'Create Scope'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScopeForm;