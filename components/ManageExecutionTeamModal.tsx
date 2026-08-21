import React, { useCallback, useEffect, useState } from 'react';
import { Icons } from './Icons';
import { ModalPortal } from './ModalPortal';
import UserAvatar from './UserAvatar';
import { ROLE_LABELS } from '../constants';
import { projectApi, getApiErrorMessage, unwrapList } from '../services/api';
import type { Project } from '../types';
import { UserRole } from '../types';
import { useTheme, getThemeClasses } from '../utils/theme';
import {
  buildExecutionTeamRoster,
  countAssignedExecutionTeam,
} from '../utils/executionTeam';

interface CandidateUser {
  id: string;
  name: string;
  email?: string;
}

interface ManageExecutionTeamModalProps {
  open: boolean;
  project: Project;
  onClose: () => void;
  onSaved: () => void;
}

function mapCandidates(payload: unknown): CandidateUser[] {
  const candidates: CandidateUser[] = [];
  for (const row of unwrapList<Record<string, unknown>>(payload)) {
    const id = row.id ?? row.user_id ?? row.pk;
    if (id == null) continue;
    const name = String(
      row.name ?? row.full_name ?? row.display_name ?? row.username ?? '',
    ).trim();
    if (!name) continue;
    candidates.push({
      id: String(id),
      name,
      email: String(row.email ?? '').trim() || undefined,
    });
  }
  return candidates;
}

const RoleAssignRow: React.FC<{
  title: string;
  hint: string;
  currentLabel: string;
  options: CandidateUser[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAssign: () => void;
  busy: boolean;
  disabled?: boolean;
  assignLabel?: string;
  isDark: boolean;
  loadingOptions?: boolean;
}> = ({
  title,
  hint,
  currentLabel,
  options,
  selectedId,
  onSelect,
  onAssign,
  busy,
  disabled,
  assignLabel = 'Assign',
  isDark,
  loadingOptions,
}) => {
  const themeClasses = getThemeClasses(isDark);
  const selectedUser = options.find((u) => u.id === selectedId);
  const missingEmail = Boolean(selectedId && selectedUser && !selectedUser.email?.trim());
  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={`text-sm font-black ${themeClasses.textPrimary}`}>{title}</p>
          <p className={`mt-0.5 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
            {hint}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
            currentLabel === 'Not assigned'
              ? isDark
                ? 'bg-amber-500/15 text-amber-300'
                : 'bg-amber-50 text-amber-700'
              : isDark
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {currentLabel === 'Not assigned' ? 'Vacant' : `Current: ${currentLabel}`}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          disabled={busy || disabled || loadingOptions}
          className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 ${
            isDark
              ? 'border-white/10 bg-slate-900 text-slate-100'
              : 'border-slate-200 bg-white text-slate-800'
          }`}
        >
          <option value="">
            {loadingOptions ? 'Loading people…' : `Select ${title}`}
          </option>
          {options.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.email ? ` · ${u.email}` : ' · (no email)'}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onAssign}
          disabled={!selectedId || busy || disabled}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Icons.Loader size={14} className="animate-spin" /> : null}
          {assignLabel}
        </button>
      </div>
      {missingEmail && (
        <p className="mt-2 text-[11px] font-semibold text-amber-500">
          This user has no email — assignment email will not be sent. Update their profile in User Management.
        </p>
      )}
    </div>
  );
};

const ManageExecutionTeamModal: React.FC<ManageExecutionTeamModalProps> = ({
  open,
  project,
  onClose,
  onSaved,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [teamLeads, setTeamLeads] = useState<CandidateUser[]>([]);
  const [coordinators, setCoordinators] = useState<CandidateUser[]>([]);
  const [siteEngineers, setSiteEngineers] = useState<CandidateUser[]>([]);
  const [billingEngineers, setBillingEngineers] = useState<CandidateUser[]>([]);
  const [qaqcEngineers, setQaqcEngineers] = useState<CandidateUser[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [selectedTl, setSelectedTl] = useState('');
  const [selectedCoord, setSelectedCoord] = useState('');
  const [selectedSe, setSelectedSe] = useState('');
  const [selectedBilling, setSelectedBilling] = useState('');
  const [selectedQaqc, setSelectedQaqc] = useState('');

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const roster = buildExecutionTeamRoster(project);
  const assignedCount = countAssignedExecutionTeam(roster);

  const currentTl =
    roster.find((r) => r.key === 'team_lead')?.name || 'Not assigned';
  const currentCoords = roster
    .filter((r) => r.key === 'coordinator' && r.assigned)
    .map((r) => r.name);
  const currentSes = roster
    .filter((r) => r.key === 'site_engineer' && r.assigned)
    .map((r) => r.name);
  const currentBilling =
    roster.find((r) => r.key === 'billing')?.name || 'Not assigned';
  const currentQaqc = roster.find((r) => r.key === 'qaqc')?.name || 'Not assigned';

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setLoadError('');
    try {
      const [tlRes, coordRes, pmcMgrRes, seRes, billRes, qaqcRes] = await Promise.all([
        projectApi.getAvailableUsers('Team Leader'),
        projectApi.getAvailableUsers('Coordinator'),
        projectApi.getAvailableUsers('PMC Manager'),
        projectApi.getAvailableUsers('Site Engineer'),
        projectApi.getAvailableUsers('Billing Site Engineer'),
        projectApi.getAvailableUsers('QAQC Site Engineer'),
      ]);
      setTeamLeads(mapCandidates(tlRes.data));
      const coordMap = new Map<string, CandidateUser>();
      for (const u of [...mapCandidates(coordRes.data), ...mapCandidates(pmcMgrRes.data)]) {
        coordMap.set(u.id, u);
      }
      setCoordinators(Array.from(coordMap.values()));
      setSiteEngineers(
        mapCandidates(seRes.data).filter(
          (u) => !(project.siteEngineerIds ?? []).includes(u.id),
        ),
      );
      setBillingEngineers(
        mapCandidates(billRes.data).filter((u) => u.id !== project.billingEngineerId),
      );
      setQaqcEngineers(
        mapCandidates(qaqcRes.data).filter((u) => u.id !== project.qaqcEngineerId),
      );
    } catch (err) {
      setLoadError(
        getApiErrorMessage(err, 'Unable to load people available for assignment.'),
      );
    } finally {
      setLoadingOptions(false);
    }
  }, [project.billingEngineerId, project.qaqcEngineerId, project.siteEngineerIds]);

  useEffect(() => {
    if (!open) return;
    setActionError('');
    setActionSuccess('');
    setSelectedTl('');
    setSelectedCoord('');
    setSelectedSe('');
    setSelectedBilling('');
    setSelectedQaqc('');
    void loadOptions();
  }, [open, loadOptions]);

  const runAssign = async (key: string, work: () => Promise<void>, successMsg: string) => {
    setBusyKey(key);
    setActionError('');
    setActionSuccess('');
    try {
      await work();
      setActionSuccess(successMsg);
      onSaved();
      await loadOptions();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Assignment failed. Please try again.'));
    } finally {
      setBusyKey(null);
    }
  };

  if (!open) return null;

  return (
    <ModalPortal open={open}>
      <div
        className={`fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4 ${
          isDarkTheme ? 'bg-black/80' : 'bg-slate-900/40'
        } backdrop-blur-sm`}
      >
        <div
          className={`flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl ${
            isDarkTheme
              ? 'border-white/10 bg-[#0b1d36]'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div
            className={`flex items-start justify-between gap-3 border-b px-5 py-4 sm:px-6 ${themeClasses.border}`}
          >
            <div className="min-w-0">
              <p
                className={`text-[10px] font-black uppercase tracking-[0.14em] ${themeClasses.textSecondary}`}
              >
                Project staffing
              </p>
              <h2 className={`mt-1 text-xl font-black tracking-tight ${themeClasses.textPrimary}`}>
                Manage Execution Team
              </h2>
              <p className={`mt-1 truncate text-sm font-semibold ${themeClasses.textSecondary}`}>
                {project.title}
              </p>
              <p className={`mt-1 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
                {assignedCount} role{assignedCount === 1 ? '' : 's'} currently filled
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border p-2 transition-colors ${
                isDarkTheme
                  ? 'border-white/10 text-slate-300 hover:bg-white/10'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
              aria-label="Close"
            >
              <Icons.Reject size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            {(loadError || actionError || actionSuccess) && (
              <div
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                  actionSuccess
                    ? isDarkTheme
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : isDarkTheme
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {actionSuccess || actionError || loadError}
              </div>
            )}

            <div
              className={`rounded-2xl border p-4 ${
                isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
              }`}
            >
              <p
                className={`mb-2 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
              >
                Who is on this project now
              </p>
              <ul className="space-y-1.5">
                {roster
                  .filter((m) => m.assigned)
                  .map((m) => (
                    <li key={m.rowId} className="flex items-center gap-2 text-sm">
                      <UserAvatar
                        name={m.name}
                        isDarkTheme={isDarkTheme}
                        className="h-7 w-7 rounded-lg"
                        iconSize={14}
                      />
                      <span className={`font-bold ${themeClasses.textPrimary}`}>{m.name}</span>
                      <span className={`text-[11px] font-semibold ${themeClasses.textSecondary}`}>
                        · {m.roleLabel}
                      </span>
                    </li>
                  ))}
                {assignedCount === 0 && (
                  <li className={`text-sm font-semibold ${themeClasses.textSecondary}`}>
                    No one assigned yet — use the sections below to staff this project.
                  </li>
                )}
              </ul>
            </div>

            <RoleAssignRow
              title={ROLE_LABELS[UserRole.TEAM_LEAD]}
              hint="Primary lead for schedule, site team, and daily delivery"
              currentLabel={currentTl}
              options={teamLeads}
              selectedId={selectedTl}
              onSelect={setSelectedTl}
              busy={busyKey === 'tl'}
              loadingOptions={loadingOptions}
              assignLabel={project.teamLeadId ? 'Reassign' : 'Assign'}
              isDark={isDarkTheme}
              onAssign={() =>
                void runAssign(
                  'tl',
                  async () => {
                    await projectApi.assignTeamLead(project.id, parseInt(selectedTl, 10));
                    setSelectedTl('');
                  },
                  'Team Leader assigned successfully.',
                )
              }
            />

            <RoleAssignRow
              title={ROLE_LABELS[UserRole.COORDINATOR]}
              hint="PMC Manager who coordinates between office and site"
              currentLabel={
                currentCoords.length ? currentCoords.join(', ') : 'Not assigned'
              }
              options={coordinators.filter(
                (u) => !(project.coordinatorIds ?? []).includes(u.id),
              )}
              selectedId={selectedCoord}
              onSelect={setSelectedCoord}
              busy={busyKey === 'coord'}
              loadingOptions={loadingOptions}
              assignLabel="Add"
              isDark={isDarkTheme}
              onAssign={() =>
                void runAssign(
                  'coord',
                  async () => {
                    await projectApi.assignCoordinator(
                      project.id,
                      parseInt(selectedCoord, 10),
                    );
                    setSelectedCoord('');
                  },
                  'PMC Manager assigned successfully.',
                )
              }
            />

            <RoleAssignRow
              title={ROLE_LABELS[UserRole.SITE_ENGINEER]}
              hint="Field engineer for progress reporting (DPR)"
              currentLabel={currentSes.length ? currentSes.join(', ') : 'Not assigned'}
              options={siteEngineers}
              selectedId={selectedSe}
              onSelect={setSelectedSe}
              busy={busyKey === 'se'}
              loadingOptions={loadingOptions}
              assignLabel="Add"
              isDark={isDarkTheme}
              onAssign={() =>
                void runAssign(
                  'se',
                  async () => {
                    await projectApi.addSiteEngineers(project.id, [
                      parseInt(selectedSe, 10),
                    ]);
                    setSelectedSe('');
                  },
                  'Site Engineer added successfully.',
                )
              }
            />

            <RoleAssignRow
              title={ROLE_LABELS[UserRole.BILLING_SITE_ENGINEER]}
              hint="Handles billing updates for this project"
              currentLabel={currentBilling}
              options={billingEngineers}
              selectedId={selectedBilling}
              onSelect={setSelectedBilling}
              busy={busyKey === 'billing'}
              loadingOptions={loadingOptions}
              assignLabel={project.billingEngineerId ? 'Reassign' : 'Assign'}
              isDark={isDarkTheme}
              onAssign={() =>
                void runAssign(
                  'billing',
                  async () => {
                    await projectApi.addBillingSiteEngineer(
                      project.id,
                      parseInt(selectedBilling, 10),
                    );
                    setSelectedBilling('');
                  },
                  'Billing Site Engineer assigned successfully.',
                )
              }
            />

            <RoleAssignRow
              title={ROLE_LABELS[UserRole.QAQC_SITE_ENGINEER]}
              hint="Quality assurance / quality control for the site"
              currentLabel={currentQaqc}
              options={qaqcEngineers}
              selectedId={selectedQaqc}
              onSelect={setSelectedQaqc}
              busy={busyKey === 'qaqc'}
              loadingOptions={loadingOptions}
              assignLabel={project.qaqcEngineerId ? 'Reassign' : 'Assign'}
              isDark={isDarkTheme}
              onAssign={() =>
                void runAssign(
                  'qaqc',
                  async () => {
                    await projectApi.addQAQCSiteEngineer(
                      project.id,
                      parseInt(selectedQaqc, 10),
                    );
                    setSelectedQaqc('');
                  },
                  'QAQC Site Engineer assigned successfully.',
                )
              }
            />
          </div>

          <div
            className={`flex items-center justify-end gap-2 border-t px-5 py-4 sm:px-6 ${themeClasses.border}`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wide ${
                isDarkTheme
                  ? 'bg-white/5 text-slate-200 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ManageExecutionTeamModal;
