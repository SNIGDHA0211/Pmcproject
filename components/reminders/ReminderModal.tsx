import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Project, User } from '../../types';
import {
  createReminder,
  getReminderApiErrorMessage,
  updateReminder,
  type ReminderRecord,
} from '../../services/remindersApi';
import { loadUserDirectory } from '../../utils/userDirectory';
import { buildProjectReminderAssignees } from '../../utils/reminderAssignees';
import {
  formatReminderDateInputValue,
  localDateTimeToIso,
} from '../../utils/reminderHelpers';
import { getThemeClasses, useTheme } from '../../utils/theme';
import { ModalPortal } from '../ModalPortal';
import { sanitizeProjectDisplayName } from '../../utils/hseSiteEngineerProjects';
import {
  notifyReminderAssigneeSafe,
} from '../../utils/reminderNotifications';

interface ReminderModalProps {
  open: boolean;
  projects: Project[];
  currentUser: User;
  editing?: ReminderRecord | null;
  /** Prefill project when opened from Project Details */
  lockedProjectId?: string | number | null;
  onClose: () => void;
  onSaved: (reminder: ReminderRecord) => void;
}

const ReminderModal: React.FC<ReminderModalProps> = ({
  open,
  projects,
  currentUser,
  editing = null,
  lockedProjectId = null,
  onClose,
  onSaved,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [directoryReady, setDirectoryReady] = useState(false);
  const [directory, setDirectory] = useState<Awaited<ReturnType<typeof loadUserDirectory>>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => p.id)
        .map((p) => ({
          id: p.id,
          name: sanitizeProjectDisplayName(p.title) || p.title,
        })),
    [projects],
  );

  const selectedProject = useMemo(
    () => projects.find((p) => String(p.id) === String(projectId)) ?? null,
    [projects, projectId],
  );

  const assignees = useMemo(
    () => buildProjectReminderAssignees(selectedProject, directory),
    [selectedProject, directory],
  );

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description || '');
      setProjectId(String(editing.project_id));
      setAssignedToId(String(editing.assigned_to_id));
      setDueAt(formatReminderDateInputValue(editing.due_at));
    } else {
      setTitle('');
      setDescription('');
      setProjectId(lockedProjectId != null ? String(lockedProjectId) : '');
      setAssignedToId('');
      const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
      setDueAt(formatReminderDateInputValue(inOneHour.toISOString()));
    }
  }, [open, editing, lockedProjectId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingUsers(true);
    setDirectoryReady(false);
    void loadUserDirectory()
      .then((users) => {
        if (!cancelled) {
          setDirectory(users);
          setDirectoryReady(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Keep assignee valid for the selected project; default to current user if they are on the team.
  useEffect(() => {
    if (!open || !directoryReady) return;
    if (!projectId) {
      setAssignedToId('');
      return;
    }
    if (assignees.length === 0) {
      setAssignedToId('');
      return;
    }
    const stillValid = assignees.some((a) => String(a.id) === String(assignedToId));
    if (stillValid) return;

    const self = assignees.find(
      (a) =>
        String(a.id) === String(currentUser.id) ||
        (currentUser.username &&
          a.username?.toLowerCase() === currentUser.username.toLowerCase()),
    );
    setAssignedToId(String(self?.id ?? assignees[0].id));
  }, [
    open,
    directoryReady,
    projectId,
    assignees,
    assignedToId,
    currentUser.id,
    currentUser.username,
  ]);

  const inputCls = `w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-400/40 ${
    isDarkTheme
      ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-500'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
  }`;
  const optionCls = isDarkTheme ? 'bg-[#121a24] text-slate-100' : 'bg-white text-slate-900';
  const labelCls = `mb-1 block text-[10px] font-black uppercase tracking-wider ${themeClasses.textSecondary}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    if (!projectId) {
      setError('Select a project.');
      return;
    }
    if (!assignedToId) {
      setError(
        assignees.length === 0
          ? 'This project has no assigned Team Lead / Site Engineers yet. Assign people on the project first.'
          : 'Select an assignee from the project team.',
      );
      return;
    }
    if (!dueAt) {
      setError('Due date/time is required.');
      return;
    }

    const allowed = assignees.some((a) => String(a.id) === String(assignedToId));
    if (!allowed) {
      setError('Assignee must be someone assigned to this project.');
      return;
    }

    setSaving(true);
    try {
      const dueIso = localDateTimeToIso(dueAt);
      if (editing) {
        const updated = await updateReminder(editing.id, {
          title: trimmedTitle,
          description: description.trim(),
          due_at: dueIso,
          assigned_to_id: Number(assignedToId),
        });
        onSaved(updated);
      } else {
        const created = await createReminder({
          project_id: Number(projectId),
          title: trimmedTitle,
          description: description.trim() || undefined,
          due_at: dueIso,
          assigned_to_id: Number(assignedToId),
        });
        notifyReminderAssigneeSafe({ reminder: created, actor: currentUser });
        onSaved(created);
      }
      onClose();
    } catch (err) {
      setError(getReminderApiErrorMessage(err, 'Could not save reminder. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal open={open}>
      <div
        className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
        role="presentation"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Edit reminder' : 'Create reminder'}
          className={`flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:rounded-2xl ${
            isDarkTheme
              ? 'border-white/10 bg-[#121a24] text-white'
              : 'border-slate-200 bg-white text-slate-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`flex items-center justify-between border-b px-4 py-3 sm:px-5 ${
              isDarkTheme ? 'border-white/10' : 'border-slate-100'
            }`}
          >
            <div>
              <h3 className="text-base font-black tracking-tight">
                {editing ? 'Edit Reminder' : 'New Reminder'}
              </h3>
              <p className={`text-[11px] font-semibold ${themeClasses.textSecondary}`}>
                Assign only to Team Lead / Site team on this project
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg p-2 ${
                isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-slate-100'
              }`}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
            {error && (
              <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                isDarkTheme
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}>
                {error}
              </div>
            )}

            <div>
              <label className={labelCls}>Title *</label>
              <input
                className={inputCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. DPR"
                maxLength={255}
              />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea
                className={`${inputCls} min-h-[80px] resize-y`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. test"
              />
            </div>

            <div>
              <label className={labelCls}>Project *</label>
              <select
                className={inputCls}
                value={projectId}
                disabled={Boolean(lockedProjectId) || Boolean(editing)}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setAssignedToId('');
                }}
              >
                <option value="" className={optionCls}>Select project</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id} className={optionCls}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Assign to * (project team only)</label>
              <select
                className={inputCls}
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                disabled={loadingUsers || !projectId}
              >
                <option value="" className={optionCls}>
                  {!projectId
                    ? 'Select a project first'
                    : loadingUsers
                      ? 'Loading project team…'
                      : assignees.length === 0
                        ? 'No team assigned on this project'
                        : 'Select assignee'}
                </option>
                {assignees.map((u) => (
                  <option key={u.id} value={u.id} className={optionCls}>
                    {u.label}
                  </option>
                ))}
              </select>
              {projectId && !loadingUsers && assignees.length === 0 && (
                <p className={`mt-1 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
                  Assign a Team Lead or Site Engineer on this project first, then create the reminder.
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>Due date & time *</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`rounded-xl border px-3.5 py-2 text-xs font-bold ${
                  isDarkTheme
                    ? 'border-white/15 text-slate-200 hover:bg-white/10'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !projectId || assignees.length === 0}
                className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create reminder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ReminderModal;
