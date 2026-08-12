import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import type { Project, User } from '../../types';
import {
  completeReminder,
  dismissReminder,
  getReminderApiErrorMessage,
  listReminders,
  snoozeReminder,
  type ReminderRecord,
} from '../../services/remindersApi';
import { REMINDER_REFRESH_MS } from '../../utils/reminderHelpers';
import { getThemeClasses, useTheme } from '../../utils/theme';
import ReminderCard from './ReminderCard';
import ReminderModal from './ReminderModal';

interface ProjectRemindersPanelProps {
  project: Project;
  currentUser: User;
}

const ProjectRemindersPanel: React.FC<ProjectRemindersPanelProps> = ({
  project,
  currentUser,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [items, setItems] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const result = await listReminders({
        project_id: project.id,
        page_size: 100,
        ordering: 'due_at',
      });
      setItems(result.results);
    } catch (err) {
      setError(getReminderApiErrorMessage(err, 'Could not load project reminders.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(true), REMINDER_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const runAction = async (id: number, work: () => Promise<ReminderRecord>) => {
    setBusyId(id);
    setError('');
    try {
      const updated = await work();
      setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      await load();
    } catch (err) {
      setError(getReminderApiErrorMessage(err, 'Action failed.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={`text-sm font-black ${themeClasses.textPrimary}`}>Project Reminders</h3>
          <p className={`text-[11px] font-semibold ${themeClasses.textSecondary}`}>
            Due items linked to this project
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${
              isDarkTheme
                ? 'border-white/15 text-slate-200 hover:bg-white/10'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"
          >
            <Plus size={14} />
            Add Reminder
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <p className={`py-8 text-center text-sm font-semibold ${themeClasses.textSecondary}`}>
          No reminders for this project yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              busy={busyId === reminder.id}
              onComplete={(id) => void runAction(id, () => completeReminder(id))}
              onDismiss={(id) => void runAction(id, () => dismissReminder(id))}
              onSnooze={(id, minutes) =>
                void runAction(id, () => snoozeReminder(id, { minutes }))
              }
            />
          ))}
        </div>
      )}

      <ReminderModal
        open={modalOpen}
        projects={[project]}
        currentUser={currentUser}
        lockedProjectId={project.id}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
};

export default ProjectRemindersPanel;
