import { UserRole, type User } from '../types';
import { isPmcHeadEquivalent } from './pmcRoleAccess';

export type DprApprovalStep = 'team_lead' | 'coordinator' | 'pmc_head';

export function normalizeDprStatus(status?: string | null): string {
  return String(status ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

/** Which backend approve action this DPR is waiting on. */
export function getDprApprovalStep(status?: string | null): DprApprovalStep | null {
  const s = normalizeDprStatus(status);
  if (s === 'pending_team_lead' || s === 'pending' || s === 'submitted') return 'team_lead';
  if (s === 'pending_coordinator') return 'coordinator';
  if (s === 'pending_pmc_head') return 'pmc_head';
  return null;
}

/** Status after a successful approve on the current step. */
export function getDprStatusAfterApproval(status?: string | null): string {
  const step = getDprApprovalStep(status);
  if (step === 'team_lead') return 'pending_coordinator';
  if (step === 'coordinator') return 'pending_pmc_head';
  if (step === 'pmc_head') return 'approved';
  return normalizeDprStatus(status) || 'approved';
}

export function canUserApproveDprStep(
  user: Pick<User, 'role'> | null | undefined,
  status?: string | null,
): boolean {
  if (!user) return false;
  const step = getDprApprovalStep(status);
  if (!step) return false;
  if (step === 'team_lead') return user.role === UserRole.TEAM_LEAD;
  // PMC Manager (Coordinator) and PMC Head share the manager/head queues in this app.
  // The endpoint is chosen from status, not from role.
  return isPmcHeadEquivalent(user);
}

export function dprApproveButtonLabel(status?: string | null): string {
  const step = getDprApprovalStep(status);
  if (step === 'team_lead') return 'Approve DPR';
  if (step === 'coordinator') return 'Approve as PMC Manager';
  if (step === 'pmc_head') return 'Approve as PMC Head';
  return 'Approve DPR';
}

export function dprApproveBusyLabel(status?: string | null): string {
  const step = getDprApprovalStep(status);
  if (step === 'coordinator') return 'Approving as PMC Manager…';
  if (step === 'pmc_head') return 'Approving as PMC Head…';
  return 'Approving…';
}

const STEP_ORDER: DprApprovalStep[] = ['team_lead', 'coordinator', 'pmc_head'];

const STEP_LABELS: Record<DprApprovalStep, string> = {
  team_lead: 'Team Leader',
  coordinator: 'PMC Manager',
  pmc_head: 'PMC Head',
};

export function getDprWorkflowSteps(
  status?: string | null,
): Array<{ id: DprApprovalStep; label: string; state: 'done' | 'current' | 'upcoming' }> {
  const s = normalizeDprStatus(status);
  const current = getDprApprovalStep(status);
  const currentIdx =
    s === 'approved' ? STEP_ORDER.length : current ? STEP_ORDER.indexOf(current) : -1;

  return STEP_ORDER.map((id, index) => ({
    id,
    label: STEP_LABELS[id],
    state:
      currentIdx < 0
        ? 'upcoming'
        : index < currentIdx
          ? 'done'
          : index === currentIdx
            ? 'current'
            : 'upcoming',
  }));
}

export function dprApproveStepHint(status?: string | null): string | null {
  const step = getDprApprovalStep(status);
  if (step === 'team_lead') return 'Next: PMC Manager, then PMC Head.';
  if (step === 'coordinator') return 'PMC Head must approve after this step.';
  if (step === 'pmc_head') return 'Final approval — this completes the DPR.';
  return null;
}
