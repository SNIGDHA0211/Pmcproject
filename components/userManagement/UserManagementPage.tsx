import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  KeyRound,
  Pencil,
  Plus,
  FolderKanban,
  Power,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import type { ManageableUserRole, ManagedUser, Project, User } from '../../types';
import {
  assignProjects,
  changePassword,
  createUser,
  deleteUser,
  extractUserFieldErrors,
  getUser,
  getUserManagementErrorMessage,
  getUsers,
  resetPassword,
  updateUser,
  updateUserStatus,
} from '../../services/userManagementApi';
import { canAccessUserManagement } from '../../utils/userManagementAccess';
import {
  buildAssignableProjectSelectOptions,
  buildLiveAssignableProjects,
  clearProjectRowCache,
  normalizeBackendProjectRow,
  seedProjectRowCache,
} from '../../utils/pmcHeadExecutiveProjects';
import { projectApi, unwrapList } from '../../services/api';
import { projectStore } from '../../stores/projectStore';
import { ModalPortal } from '../ModalPortal';
import DashboardToastStack, { type DashboardToastItem } from '../DashboardToastStack';
import TutorialVideosPanel from '../tutorialVideos/TutorialVideosPanel';
import TutorialWatchButton from '../tutorialVideos/TutorialWatchButton';
import { getThemeClasses, useTheme } from '../../utils/theme';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { isAbortError } from '../../utils/isAbortError';

const PAGE_SIZE = 10;

/** Prefer Global Project Store; fall back to paginated GET only if store is empty. */
async function fetchAllBackendProjects(): Promise<Project[]> {
  try {
    const fromStore = await projectStore.loadProjects(false);
    if (fromStore.length > 0) {
      return fromStore.filter((p) => Boolean(p?.id && p?.title?.trim()));
    }
  } catch {
    // fall through to paginated fetch
  }

  const collected: Record<string, unknown>[] = [];
  let page = 1;
  let guard = 0;

  while (guard < 50) {
    guard += 1;
    const response = await projectApi.getProjects({ page_size: 200, page });
    const payload = response.data as Record<string, unknown> | unknown[];
    const rows = unwrapList<Record<string, unknown>>(payload);
    collected.push(...rows.filter((row) => row && typeof row === 'object'));

    const next =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as Record<string, unknown>).next
        : null;
    if (!next || rows.length === 0) break;
    page += 1;
  }

  clearProjectRowCache();
  seedProjectRowCache(collected);
  return collected
    .map((row) => normalizeBackendProjectRow(row))
    .filter((p) => Boolean(p?.id && p?.title?.trim()));
}

export const MANAGEABLE_ROLES: ManageableUserRole[] = [
  'Team Leader',
  'Site Engineer',
  'Billing Site Engineer',
  'QAQC Site Engineer',
  'HSE Site Engineer',
];

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type UserFormState = {
  fullName: string;
  username: string;
  role: ManageableUserRole | '';
  projectIds: number[];
  password: string;
  confirmPassword: string;
  isActive: boolean;
};

const emptyForm = (): UserFormState => ({
  fullName: '',
  username: '',
  role: '',
  projectIds: [],
  password: '',
  confirmPassword: '',
  isActive: true,
});

type PasswordFormState = {
  password: string;
  confirmPassword: string;
};

type ConfirmAction =
  | { type: 'status'; user: ManagedUser; nextActive: boolean }
  | { type: 'delete'; user: ManagedUser }
  | { type: 'reset'; user: ManagedUser };

interface UserManagementPageProps {
  projects?: Project[];
  currentUser: User;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({
  projects = [],
  currentUser,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const allowed = canAccessUserManagement(currentUser);

  /** Same projects as Enterprise Portfolio Live Project Registry (active only). */
  const [portfolioProjects, setPortfolioProjects] = useState<Project[]>(() =>
    buildLiveAssignableProjects(projects, projects),
  );
  const [projectOptions, setProjectOptions] = useState(() =>
    buildAssignableProjectSelectOptions(
      buildLiveAssignableProjects(projects, projects),
    ),
  );

  useEffect(() => {
    setProjectOptions(buildAssignableProjectSelectOptions(portfolioProjects));
  }, [portfolioProjects]);

  const refreshAssignableProjects = useCallback(async () => {
    try {
      const mapped = await projectStore.refreshProjects();
      // Live Registry (App) + store list — completed/deleted excluded inside builder.
      setPortfolioProjects(buildLiveAssignableProjects(mapped, projects));
    } catch {
      setPortfolioProjects(buildLiveAssignableProjects(projects, projects));
    }
  }, [projects]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;

    // Load once when User Management opens — not on every App `projects` identity change.
    void (async () => {
      try {
        const mapped = await fetchAllBackendProjects();
        if (!cancelled) {
          setPortfolioProjects(buildLiveAssignableProjects(mapped, projects));
        }
      } catch {
        if (!cancelled) {
          setPortfolioProjects(buildLiveAssignableProjects(projects, projects));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / allowed only
  }, [allowed]);

  // Sync titles from Live Registry without another full projects pagination.
  useEffect(() => {
    setPortfolioProjects((prev) => {
      if (!projects.length) return prev;
      return buildLiveAssignableProjects(prev, projects);
    });
  }, [projects]);

  const [roleFilter, setRoleFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim());
  const [page, setPage] = useState(1);

  const prevSearchRef = useRef(search);
  useEffect(() => {
    if (prevSearchRef.current !== search) {
      prevSearchRef.current = search;
      setPage(1);
    }
  }, [search]);

  const [items, setItems] = useState<ManagedUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toasts, setToasts] = useState<DashboardToastItem[]>([]);
  const toastIdRef = useRef(0);
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  /** Assignable projects need a real backend id. Keep current selections visible when editing. */
  const assignableProjectOptions = useMemo(() => {
    const byId = new Map(
      projectOptions.filter((p) => p.id > 0).map((p) => [p.id, p] as const),
    );

    const ensureOption = (id: number, name?: string) => {
      if (!id || byId.has(id)) return;
      byId.set(id, {
        id,
        name: String(name ?? '').trim() || `Project ${id}`,
      });
    };

    for (const id of form.projectIds) {
      const fromUser = editing?.projects.find((p) => p.id === id);
      ensureOption(id, fromUser?.name);
    }

    if (editing) {
      for (const p of editing.projects) ensureOption(p.id, p.name);
    }

    return [...byId.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }, [projectOptions, form.projectIds, editing]);

  const filterProjectOptions = assignableProjectOptions;

  const [viewUser, setViewUser] = useState<ManagedUser | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [assignUser, setAssignUser] = useState<ManagedUser | null>(null);
  const [assignIds, setAssignIds] = useState<number[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);
  const [passwordMode, setPasswordMode] = useState<'change' | 'reset'>('change');
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    password: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const loadList = useCallback(async (signal?: AbortSignal) => {
    if (!allowed) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        project: projectFilter || undefined,
        status: statusFilter || undefined,
        page,
        page_size: PAGE_SIZE,
        signal,
      });
      if (signal?.aborted) return;
      if (!result.success) {
        setItems([]);
        setCount(0);
        setError(result.message || 'Unable to load users.');
        return;
      }
      setItems(result.results);
      setCount(result.count);
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      setItems([]);
      setCount(0);
      setError(getUserManagementErrorMessage(err, 'Unable to load users.'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [allowed, search, roleFilter, projectFilter, statusFilter, page]);

  useEffect(() => {
    const controller = new AbortController();
    void loadList(controller.signal);
    return () => controller.abort();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const cardCls = `rounded-2xl border ${
    isDarkTheme
      ? `${themeClasses.glassCard} ${themeClasses.border}`
      : 'border-slate-200 bg-white shadow-sm'
  }`;
  const inputCls = `w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`;
  const labelCls = `mb-1 block text-[10px] font-bold uppercase tracking-wider ${themeClasses.textSecondary}`;
  const actionBtnCls = `inline-flex items-center justify-center rounded-lg border p-1.5 transition ${
    isDarkTheme
      ? 'border-white/10 text-slate-300 hover:bg-white/10'
      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
  }`;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
    void refreshAssignableProjects();
  };

  const openEdit = (user: ManagedUser) => {
    setEditing(user);
    setForm({
      fullName: user.fullName,
      username: user.username,
      role: (MANAGEABLE_ROLES.includes(user.role as ManageableUserRole)
        ? user.role
        : '') as ManageableUserRole | '',
      projectIds: user.projects.map((p) => p.id),
      password: '',
      confirmPassword: '',
      isActive: user.isActive,
    });
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
    void refreshAssignableProjects();
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setFieldErrors({});
  };

  const toggleProjectId = (id: number) => {
    setForm((prev) => ({
      ...prev,
      projectIds: prev.projectIds.includes(id)
        ? prev.projectIds.filter((x) => x !== id)
        : [...prev.projectIds, id],
    }));
  };

  const handleSaveUser = async () => {
    setFormError(null);
    setFieldErrors({});

    if (!form.fullName.trim()) {
      setFieldErrors({ full_name: 'Full name is required.' });
      setFormError('Full name is required.');
      return;
    }
    if (!form.username.trim()) {
      setFieldErrors({ username: 'Username is required.' });
      setFormError('Username is required.');
      return;
    }
    if (!form.role) {
      setFieldErrors({ role: 'Please select a role.' });
      setFormError('Please select a role.');
      return;
    }
    if (form.projectIds.length === 0) {
      setFieldErrors({ project_ids: 'Please select at least one project.' });
      setFormError('Please select at least one project.');
      return;
    }
    if (!editing) {
      if (!form.password) {
        setFieldErrors({ password: 'Password is required.' });
        setFormError('Password is required.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setFieldErrors({ confirm_password: 'Passwords do not match.' });
        setFormError('Passwords do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      if (editing) {
        const result = await updateUser(editing.id, {
          full_name: form.fullName.trim(),
          username: form.username.trim(),
          role: form.role,
          project_ids: form.projectIds,
          is_active: form.isActive,
          status: form.isActive ? 'active' : 'inactive',
        });
        if (!result.success) {
          setFormError(result.message || 'Failed to update user.');
          return;
        }
        showToast(result.message || 'User updated successfully.');
      } else {
        const result = await createUser({
          full_name: form.fullName.trim(),
          username: form.username.trim(),
          role: form.role,
          project_ids: form.projectIds,
          password: form.password,
          confirm_password: form.confirmPassword,
        });
        if (!result.success) {
          setFormError(result.message || 'Failed to create user.');
          return;
        }
        showToast(result.message || 'User created successfully.');
      }
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm());
      await loadList();
    } catch (err) {
      const fields = extractUserFieldErrors(err);
      setFieldErrors(fields);
      setFormError(
        getUserManagementErrorMessage(
          err,
          editing ? 'Failed to update user.' : 'Failed to create user.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const openView = async (user: ManagedUser) => {
    setViewUser(user);
    setViewLoading(true);
    try {
      const result = await getUser(user.id);
      if (result.success && result.user) {
        setViewUser(result.user);
      }
    } catch {
      // keep list row data
    } finally {
      setViewLoading(false);
    }
  };

  const openAssign = (user: ManagedUser) => {
    setAssignUser(user);
    setAssignIds(user.projects.map((p) => p.id));
    setAssignError(null);
    void refreshAssignableProjects();
  };

  const handleAssign = async () => {
    if (!assignUser) return;
    if (assignIds.length === 0) {
      setAssignError('Please select at least one project.');
      return;
    }
    setAssignSaving(true);
    setAssignError(null);
    try {
      const result = await assignProjects(assignUser.id, assignIds);
      if (!result.success) {
        setAssignError(result.message || 'Failed to assign projects.');
        return;
      }
      showToast(result.message || 'Projects assigned successfully.');
      setAssignUser(null);
      await loadList();
    } catch (err) {
      setAssignError(
        getUserManagementErrorMessage(err, 'Failed to assign projects.'),
      );
    } finally {
      setAssignSaving(false);
    }
  };

  const openPassword = (user: ManagedUser, mode: 'change' | 'reset') => {
    setPasswordUser(user);
    setPasswordMode(mode);
    setPasswordForm({ password: '', confirmPassword: '' });
    setPasswordError(null);
    setPasswordFieldErrors({});
  };

  const handlePasswordSubmit = async () => {
    if (!passwordUser) return;
    setPasswordError(null);
    setPasswordFieldErrors({});

    if (!passwordForm.password) {
      setPasswordFieldErrors({ password: 'New password is required.' });
      setPasswordError('New password is required.');
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordFieldErrors({ confirm_password: 'Passwords do not match.' });
      setPasswordError('Passwords do not match.');
      return;
    }

    if (passwordMode === 'reset') {
      setConfirmAction({ type: 'reset', user: passwordUser });
      return;
    }

    setPasswordSaving(true);
    try {
      const result = await changePassword(
        passwordUser.id,
        passwordForm.password,
        passwordForm.confirmPassword,
      );
      if (!result.success) {
        setPasswordError(result.message || 'Failed to change password.');
        return;
      }
      showToast(result.message || 'Password changed successfully.');
      setPasswordUser(null);
    } catch (err) {
      setPasswordFieldErrors(extractUserFieldErrors(err));
      setPasswordError(
        getUserManagementErrorMessage(err, 'Failed to change password.'),
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmBusy(true);
    try {
      if (confirmAction.type === 'status') {
        const result = await updateUserStatus(
          confirmAction.user.id,
          confirmAction.nextActive,
        );
        if (!result.success) {
          showToast(
            result.message || 'Failed to update user status.',
            'error',
          );
          return;
        }
        showToast(
          result.message ||
            (confirmAction.nextActive
              ? 'User activated successfully.'
              : 'User deactivated successfully.'),
        );
        setConfirmAction(null);
        await loadList();
      } else if (confirmAction.type === 'delete') {
        const result = await deleteUser(confirmAction.user.id);
        if (!result.success) {
          showToast(result.message || 'Failed to delete user.', 'error');
          return;
        }
        showToast(result.message || 'User deactivated successfully.');
        setConfirmAction(null);
        if (viewUser?.id === confirmAction.user.id) setViewUser(null);
        await loadList();
      } else if (confirmAction.type === 'reset' && passwordUser) {
        const result = await resetPassword(
          passwordUser.id,
          passwordForm.password,
          passwordForm.confirmPassword,
        );
        if (!result.success) {
          setPasswordError(result.message || 'Failed to reset password.');
          setConfirmAction(null);
          return;
        }
        showToast(result.message || 'Password reset successfully.');
        setConfirmAction(null);
        setPasswordUser(null);
      }
    } catch (err) {
      if (confirmAction.type === 'reset') {
        setPasswordFieldErrors(extractUserFieldErrors(err));
        setPasswordError(
          getUserManagementErrorMessage(err, 'Failed to reset password.'),
        );
        setConfirmAction(null);
      } else {
        showToast(
          getUserManagementErrorMessage(err, 'Action failed.'),
          'error',
        );
      }
    } finally {
      setConfirmBusy(false);
    }
  };

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h2 className={`text-xl font-black ${themeClasses.textPrimary}`}>
          Access restricted
        </h2>
        <p className={`mt-2 text-sm font-semibold ${themeClasses.textSecondary}`}>
          User Management is available only to Head Office, CEO, PMC Head, and
          superusers.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 animate-in fade-in duration-500">
      <header
        className={`flex flex-wrap items-end justify-between gap-3 rounded-2xl border px-4 py-3.5 sm:px-5 ${
          isDarkTheme
            ? 'border-indigo-500/25 bg-indigo-500/10'
            : 'border-indigo-100 bg-white shadow-sm'
        }`}
      >
        <div>
          <h2
            className={`text-xl font-black tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}
          >
            User Management
          </h2>
          <p className={`mt-0.5 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
            Create and manage Team Leaders and site engineers
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <TutorialWatchButton section="user_management" variant="panel" isDark={isDarkTheme} />
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500"
          >
          <Plus size={14} />
          New User
          </button>
        </div>
      </header>

      <section className={`${cardCls} p-4 sm:p-5`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2">
            <label className={labelCls}>Search</label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Full name, username, role, project…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">All</option>
              {MANAGEABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Project</label>
            <select
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">All</option>
              {filterProjectOptions.map((p) => (
                <option
                  key={`${p.id}-${p.name}`}
                  value={p.id}
                >
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'active' | 'inactive' | '');
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadList()}
              className={`w-full rounded-xl border px-3 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <section className={`${cardCls} overflow-hidden`}>
        <div
          className={`flex items-center justify-between border-b px-4 py-3 sm:px-5 ${
            isDarkTheme ? 'border-white/10' : 'border-slate-100'
          }`}
        >
          <h3 className={`text-sm font-black ${themeClasses.textPrimary}`}>
            Users ({count})
          </h3>
        </div>

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className={`px-4 py-16 text-center text-sm font-semibold ${themeClasses.textSecondary}`}>
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr
                  className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                    isDarkTheme
                      ? 'border-white/10 text-slate-400'
                      : 'border-slate-100 text-slate-500'
                  }`}
                >
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Projects</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-b last:border-0 ${
                      isDarkTheme ? 'border-white/5' : 'border-slate-50'
                    }`}
                  >
                    <td className={`px-4 py-3 font-bold ${themeClasses.textPrimary}`}>
                      {user.fullName || '—'}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${themeClasses.textSecondary}`}>
                      {user.username}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${themeClasses.textPrimary}`}>
                      {user.role || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[220px] flex-wrap gap-1">
                        {user.projects.length === 0 ? (
                          <span className={themeClasses.textSecondary}>—</span>
                        ) : (
                          user.projects.slice(0, 3).map((p) => (
                            <span
                              key={p.id}
                              className={`inline-flex max-w-[140px] truncate rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isDarkTheme
                                  ? 'bg-indigo-500/20 text-indigo-200'
                                  : 'bg-indigo-50 text-indigo-700'
                              }`}
                              title={p.name}
                            >
                              {p.name}
                            </span>
                          ))
                        )}
                        {user.projects.length > 3 && (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isDarkTheme
                                ? 'bg-slate-500/20 text-slate-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            +{user.projects.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          user.isActive
                            ? isDarkTheme
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-emerald-100 text-emerald-700'
                            : isDarkTheme
                              ? 'bg-slate-500/20 text-slate-300'
                              : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${themeClasses.textSecondary}`}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${themeClasses.textSecondary}`}>
                      {formatDateTime(user.lastLogin)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          title="View"
                          className={actionBtnCls}
                          onClick={() => void openView(user)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          className={actionBtnCls}
                          onClick={() => openEdit(user)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="Assign projects"
                          className={actionBtnCls}
                          onClick={() => openAssign(user)}
                        >
                          <FolderKanban size={14} />
                        </button>
                        <button
                          type="button"
                          title="Change password"
                          className={actionBtnCls}
                          onClick={() => openPassword(user, 'change')}
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          type="button"
                          title="Reset password"
                          className={actionBtnCls}
                          onClick={() => openPassword(user, 'reset')}
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          type="button"
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                          className={actionBtnCls}
                          onClick={() =>
                            setConfirmAction({
                              type: 'status',
                              user,
                              nextActive: !user.isActive,
                            })
                          }
                        >
                          <Power size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          className={`${actionBtnCls} ${
                            isDarkTheme
                              ? 'text-rose-300 hover:bg-rose-500/20'
                              : 'text-rose-600 hover:bg-rose-50'
                          }`}
                          onClick={() =>
                            setConfirmAction({ type: 'delete', user })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5 ${
            isDarkTheme ? 'border-white/10' : 'border-slate-100'
          }`}
        >
          <p className={`text-xs font-semibold ${themeClasses.textSecondary}`}>
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${themeClasses.buttonSecondary} ${themeClasses.border}`}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${themeClasses.buttonSecondary} ${themeClasses.border}`}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Create / Edit */}
      <ModalPortal open={formOpen}>
        <div className="fixed inset-0 z-[100040] flex items-center justify-center bg-black/50 p-4">
          <div
            className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-5 shadow-2xl ${
              isDarkTheme
                ? 'border-white/10 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">
                  {editing ? 'Edit User' : 'Create User'}
                </h3>
                <p className={`text-xs font-semibold ${themeClasses.textSecondary}`}>
                  Only Team Leader and site engineer roles can be managed
                </p>
              </div>
              <button type="button" onClick={closeForm} className={actionBtnCls}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>Full Name</label>
                <input
                  className={inputCls}
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                />
                {fieldErrors.full_name && (
                  <p className="mt-1 text-xs font-semibold text-rose-500">
                    {fieldErrors.full_name}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Username</label>
                <input
                  className={inputCls}
                  value={form.username}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                />
                {fieldErrors.username && (
                  <p className="mt-1 text-xs font-semibold text-rose-500">
                    {fieldErrors.username}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select
                  className={inputCls}
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      role: e.target.value as ManageableUserRole | '',
                    }))
                  }
                >
                  <option value="">Select role</option>
                  {MANAGEABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {fieldErrors.role && (
                  <p className="mt-1 text-xs font-semibold text-rose-500">
                    {fieldErrors.role}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Assigned Project(s)</label>
                <div
                  className={`max-h-72 space-y-1 overflow-y-auto rounded-xl border p-2 ${themeClasses.border}`}
                >
                  {assignableProjectOptions.length === 0 ? (
                    <p className={`text-xs font-semibold ${themeClasses.textSecondary}`}>
                      No projects available
                    </p>
                  ) : (
                    assignableProjectOptions.map((p) => (
                      <label
                        key={`${p.id}-${p.name}`}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={form.projectIds.includes(p.id)}
                          onChange={() => toggleProjectId(p.id)}
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    ))
                  )}
                </div>
                {(fieldErrors.project_ids || fieldErrors.projects) && (
                  <p className="mt-1 text-xs font-semibold text-rose-500">
                    {fieldErrors.project_ids || fieldErrors.projects}
                  </p>
                )}
              </div>
              {editing && (
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    className={inputCls}
                    value={form.isActive ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        isActive: e.target.value === 'active',
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
              {!editing && (
                <>
                  <div>
                    <label className={labelCls}>Password</label>
                    <input
                      type="password"
                      className={inputCls}
                      value={form.password}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                    />
                    {(fieldErrors.password || fieldErrors.new_password) && (
                      <p className="mt-1 text-xs font-semibold text-rose-500">
                        {fieldErrors.password || fieldErrors.new_password}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password</label>
                    <input
                      type="password"
                      className={inputCls}
                      value={form.confirmPassword}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                    />
                    {(fieldErrors.confirm_password ||
                      fieldErrors.confirm_new_password) && (
                      <p className="mt-1 text-xs font-semibold text-rose-500">
                        {fieldErrors.confirm_password ||
                          fieldErrors.confirm_new_password}
                      </p>
                    )}
                  </div>
                </>
              )}
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  {formError}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={closeForm}
                className={`rounded-xl border px-3.5 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveUser()}
                className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* View */}
      <ModalPortal open={Boolean(viewUser)}>
        {viewUser && (
          <div className="fixed inset-0 z-[100040] flex items-center justify-center bg-black/50 p-4">
            <div
              className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
                isDarkTheme
                  ? 'border-white/10 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-lg font-black">User Details</h3>
                <button
                  type="button"
                  onClick={() => setViewUser(null)}
                  className={actionBtnCls}
                >
                  <X size={16} />
                </button>
              </div>
              {viewLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  {[
                    ['Full Name', viewUser.fullName],
                    ['Username', viewUser.username],
                    ['Role', viewUser.role],
                    ['Status', viewUser.isActive ? 'Active' : 'Inactive'],
                    ['Created', formatDateTime(viewUser.createdAt)],
                    ['Last Login', formatDateTime(viewUser.lastLogin)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className={labelCls}>{label}</dt>
                      <dd className={`font-bold ${themeClasses.textPrimary}`}>
                        {value || '—'}
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt className={labelCls}>Assigned Projects</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {viewUser.projects.length === 0 ? (
                        <span className={themeClasses.textSecondary}>—</span>
                      ) : (
                        viewUser.projects.map((p) => (
                          <span
                            key={p.id}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isDarkTheme
                                ? 'bg-indigo-500/20 text-indigo-200'
                                : 'bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            {p.name}
                          </span>
                        ))
                      )}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        )}
      </ModalPortal>

      {/* Assign projects */}
      <ModalPortal open={Boolean(assignUser)}>
        {assignUser && (
          <div className="fixed inset-0 z-[100040] flex items-center justify-center bg-black/50 p-4">
            <div
              className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
                isDarkTheme
                  ? 'border-white/10 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black">Assign Projects</h3>
                  <p className={`text-xs font-semibold ${themeClasses.textSecondary}`}>
                    {assignUser.fullName} ({assignUser.username})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !assignSaving && setAssignUser(null)}
                  className={actionBtnCls}
                >
                  <X size={16} />
                </button>
              </div>
              <div
                className={`max-h-72 space-y-1 overflow-y-auto rounded-xl border p-2 ${themeClasses.border}`}
              >
                {assignableProjectOptions.length === 0 ? (
                  <p className={`px-2 py-1.5 text-xs font-semibold ${themeClasses.textSecondary}`}>
                    No projects available
                  </p>
                ) : (
                  assignableProjectOptions.map((p) => (
                    <label
                      key={`${p.id}-${p.name}`}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={assignIds.includes(p.id)}
                        onChange={() =>
                          setAssignIds((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((x) => x !== p.id)
                              : [...prev, p.id],
                          )
                        }
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))
                )}
              </div>
              {assignError && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  {assignError}
                </div>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={assignSaving}
                  onClick={() => setAssignUser(null)}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={assignSaving}
                  onClick={() => void handleAssign()}
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {assignSaving ? 'Saving…' : 'Save Assignments'}
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* Change / Reset password */}
      <ModalPortal open={Boolean(passwordUser)}>
        {passwordUser && (
          <div className="fixed inset-0 z-[100040] flex items-center justify-center bg-black/50 p-4">
            <div
              className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
                isDarkTheme
                  ? 'border-white/10 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black">
                    {passwordMode === 'change'
                      ? 'Change Password'
                      : 'Reset Password'}
                  </h3>
                  <p className={`text-xs font-semibold ${themeClasses.textSecondary}`}>
                    {passwordUser.fullName} ({passwordUser.username})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => !passwordSaving && setPasswordUser(null)}
                  className={actionBtnCls}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>New Password</label>
                  <input
                    type="password"
                    className={inputCls}
                    value={passwordForm.password}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                  />
                  {(passwordFieldErrors.password ||
                    passwordFieldErrors.new_password) && (
                    <p className="mt-1 text-xs font-semibold text-rose-500">
                      {passwordFieldErrors.password ||
                        passwordFieldErrors.new_password}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Confirm Password</label>
                  <input
                    type="password"
                    className={inputCls}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                  />
                  {(passwordFieldErrors.confirm_password ||
                    passwordFieldErrors.confirm_new_password) && (
                    <p className="mt-1 text-xs font-semibold text-rose-500">
                      {passwordFieldErrors.confirm_password ||
                        passwordFieldErrors.confirm_new_password}
                    </p>
                  )}
                </div>
                {passwordError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    {passwordError}
                  </div>
                )}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={passwordSaving}
                  onClick={() => setPasswordUser(null)}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={passwordSaving}
                  onClick={() => void handlePasswordSubmit()}
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {passwordSaving
                    ? 'Saving…'
                    : passwordMode === 'change'
                      ? 'Change Password'
                      : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* Confirm */}
      <ModalPortal open={Boolean(confirmAction)}>
        {confirmAction && (
          <div className="fixed inset-0 z-[100050] flex items-center justify-center bg-black/50 p-4">
            <div
              className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${
                isDarkTheme
                  ? 'border-white/10 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900'
              }`}
            >
              <h3 className="text-lg font-black">
                {confirmAction.type === 'status'
                  ? confirmAction.nextActive
                    ? 'Activate user?'
                    : 'Deactivate user?'
                  : confirmAction.type === 'delete'
                    ? 'Delete user?'
                    : 'Reset password?'}
              </h3>
              <p className={`mt-2 text-sm font-semibold ${themeClasses.textSecondary}`}>
                {confirmAction.type === 'status' &&
                  `${confirmAction.user.fullName} will be marked ${
                    confirmAction.nextActive ? 'active' : 'inactive'
                  }.`}
                {confirmAction.type === 'delete' &&
                  `${confirmAction.user.fullName} will be soft-deleted (deactivated).`}
                {confirmAction.type === 'reset' &&
                  `Set a new password for ${confirmAction.user.fullName}?`}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={confirmBusy}
                  onClick={() => setConfirmAction(null)}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={confirmBusy}
                  onClick={() => void runConfirmAction()}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60 ${
                    confirmAction.type === 'delete'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {confirmBusy ? 'Working…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>

      <DashboardToastStack toasts={toasts} />
      <TutorialVideosPanel section="user_management" />
    </div>
  );
};

export default UserManagementPage;
