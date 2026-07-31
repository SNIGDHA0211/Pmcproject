import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Icons } from './Icons';
import SiteDeleteDialog, { type SiteDeleteDependency } from './SiteDeleteDialog';
import DashboardToastStack, { type DashboardToastItem } from './DashboardToastStack';
import { getApiErrorMessage, projectApi } from '../services/api';
import type { User } from '../types';
import { canDeleteProjectSite } from '../utils/userManagementAccess';
import { useTheme, getThemeClasses } from '../utils/theme';
import { sanitizeProjectDisplayName } from '../utils/hseSiteEngineerProjects';

export type ProjectSite = {
  id: number | string;
  name: string;
  location?: string;
  status?: string;
  project?: number | string;
};

interface ProjectSiteListProps {
  projectId: string;
  currentUser: User;
  /** When true, hide delete actions (completed / read-only projects). */
  readOnly?: boolean;
}

function unwrapSites(payload: unknown): ProjectSite[] {
  if (Array.isArray(payload)) return payload as ProjectSite[];
  if (payload && typeof payload === 'object') {
    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.results)) return body.results as ProjectSite[];
    if (Array.isArray(body.data)) return body.data as ProjectSite[];
  }
  return [];
}

export function parseSiteDeleteDependencies(data: unknown): SiteDeleteDependency[] {
  if (!data || typeof data !== 'object') return [];
  const body = data as Record<string, unknown>;
  const raw = body.dependencies ?? body.dependency ?? body.blocking_dependencies;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return { label: item };
        if (item && typeof item === 'object') {
          const row = item as Record<string, unknown>;
          const label = String(
            row.label ?? row.name ?? row.type ?? row.key ?? 'Record',
          );
          const countRaw = row.count ?? row.total ?? row.quantity;
          const count =
            typeof countRaw === 'number'
              ? countRaw
              : countRaw != null && Number.isFinite(Number(countRaw))
                ? Number(countRaw)
                : undefined;
          return { label, count };
        }
        return null;
      })
      .filter((d): d is SiteDeleteDependency => Boolean(d));
  }

  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).map(([label, value]) => {
      if (typeof value === 'number') return { label, count: value };
      if (Array.isArray(value)) return { label, count: value.length };
      if (value && typeof value === 'object') {
        const nested = value as Record<string, unknown>;
        const countRaw = nested.count ?? nested.total;
        const count =
          typeof countRaw === 'number'
            ? countRaw
            : Array.isArray(nested.items)
              ? nested.items.length
              : undefined;
        return { label, count };
      }
      return { label: `${label}: ${String(value)}` };
    });
  }

  return [];
}

const ProjectSiteList: React.FC<ProjectSiteListProps> = ({
  projectId,
  currentUser,
  readOnly = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const canDelete = canDeleteProjectSite(currentUser) && !readOnly;

  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sitePendingDelete, setSitePendingDelete] = useState<ProjectSite | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<SiteDeleteDependency[]>([]);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<DashboardToastItem[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    [],
  );

  const loadSites = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      const response = await projectApi.getSites(projectId);
      setSites(unwrapSites(response.data));
    } catch (err) {
      setLoadError(getApiErrorMessage(err, 'Unable to load sites for this project.'));
      setSites([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setSitePendingDelete(null);
    setDependencyError(null);
    setDependencies([]);
    setDialogError(null);
  };

  const handleConfirmDelete = async () => {
    if (!sitePendingDelete || isDeleting) return;

    setIsDeleting(true);
    setDialogError(null);
    setDependencyError(null);
    setDependencies([]);

    try {
      const response = await projectApi.deleteSite(sitePendingDelete.id);
      const message =
        (response.data &&
          typeof response.data === 'object' &&
          typeof (response.data as { message?: string }).message === 'string' &&
          (response.data as { message: string }).message) ||
        'Site deleted successfully.';

      const deletedId = sitePendingDelete.id;
      setSitePendingDelete(null);
      setSites((prev) => prev.filter((s) => String(s.id) !== String(deletedId)));
      showToast(message, 'success');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 400) {
          const deps = parseSiteDeleteDependencies(data);
          setDependencies(deps);
          setDependencyError(
            getApiErrorMessage(
              err,
              'This site cannot be deleted because it is referenced by existing records.',
            ),
          );
          return;
        }

        if (status === 403) {
          const msg = 'You do not have permission to delete this site.';
          setDialogError(msg);
          showToast(msg, 'error');
          return;
        }

        if (status === 404) {
          const msg = 'The selected site no longer exists.';
          setSitePendingDelete(null);
          showToast(msg, 'error');
          await loadSites();
          return;
        }

        const msg = getApiErrorMessage(err, 'Failed to delete site.');
        setDialogError(msg);
        showToast(msg, 'error');
        return;
      }

      const msg = getApiErrorMessage(err, 'Failed to delete site.');
      setDialogError(msg);
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusLabel = (status?: string) => {
    if (!status) return '—';
    return status.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-3">
      <DashboardToastStack toasts={toasts} />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3
            className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}
          >
            Site List
          </h3>
          <p
            className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
          >
            Project sites
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSites()}
          disabled={isLoading}
          className={`rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${themeClasses.buttonSecondary} ${themeClasses.border}`}
        >
          Refresh
        </button>
      </div>

      <div
        className={`overflow-hidden rounded-2xl border sm:rounded-[1.5rem] ${themeClasses.glassCard} ${themeClasses.border}`}
      >
        {isLoading ? (
          <div
            className={`flex items-center justify-center gap-2 px-6 py-10 text-sm font-semibold ${themeClasses.textSecondary}`}
          >
            <Icons.Loader size={18} className="animate-spin" aria-hidden />
            Loading sites…
          </div>
        ) : loadError ? (
          <div className="space-y-3 px-6 py-8 text-center">
            <p className="text-sm font-semibold text-rose-500">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadSites()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
            >
              Retry
            </button>
          </div>
        ) : sites.length === 0 ? (
          <p
            className={`px-6 py-10 text-center text-sm font-semibold ${themeClasses.textSecondary}`}
          >
            No sites found for this project.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr
                  className={`border-b ${themeClasses.bgSecondary} ${themeClasses.border}`}
                >
                  <th
                    className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest sm:px-6 ${themeClasses.textSecondary}`}
                  >
                    Site
                  </th>
                  <th
                    className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest sm:px-6 ${themeClasses.textSecondary}`}
                  >
                    Location
                  </th>
                  <th
                    className={`hidden px-4 py-3 text-[10px] font-black uppercase tracking-widest sm:table-cell sm:px-6 ${themeClasses.textSecondary}`}
                  >
                    Status
                  </th>
                  {canDelete && (
                    <th
                      className={`px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest sm:px-6 ${themeClasses.textSecondary}`}
                    >
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${themeClasses.border}`}>
                {sites.map((site) => (
                  <tr key={String(site.id)} className={themeClasses.bgHover}>
                    <td className="px-4 py-4 sm:px-6">
                      <p
                        className={`text-sm font-black tracking-tight ${themeClasses.textPrimary}`}
                      >
                        {sanitizeProjectDisplayName(site.name) || site.name}
                      </p>
                      <p
                        className={`mt-0.5 text-[10px] font-bold sm:hidden ${themeClasses.textSecondary}`}
                      >
                        {statusLabel(site.status)}
                      </p>
                    </td>
                    <td
                      className={`px-4 py-4 text-xs font-bold sm:px-6 ${themeClasses.textSecondary}`}
                    >
                      {site.location || '—'}
                    </td>
                    <td className="hidden px-4 py-4 sm:table-cell sm:px-6">
                      <span
                        className={`inline-block rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase ${themeClasses.border} ${themeClasses.textPrimary}`}
                      >
                        {statusLabel(site.status)}
                      </span>
                    </td>
                    {canDelete && (
                      <td className="px-4 py-4 text-right sm:px-6">
                        <button
                          type="button"
                          onClick={() => {
                            setDependencyError(null);
                            setDependencies([]);
                            setDialogError(null);
                            setSitePendingDelete(site);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                            isDarkTheme
                              ? 'border-rose-500/40 bg-rose-600/15 text-rose-300 hover:bg-rose-600/30'
                              : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                          aria-label={`Delete site ${site.name}`}
                        >
                          <Icons.Trash size={14} aria-hidden />
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SiteDeleteDialog
        open={Boolean(sitePendingDelete)}
        siteName={
          sitePendingDelete
            ? sanitizeProjectDisplayName(sitePendingDelete.name) ||
              sitePendingDelete.name
            : undefined
        }
        onCancel={closeDeleteDialog}
        onConfirm={() => void handleConfirmDelete()}
        isDeleting={isDeleting}
        dependencyError={dependencyError}
        dependencies={dependencies}
        errorMessage={dialogError}
      />
    </div>
  );
};

export default ProjectSiteList;
