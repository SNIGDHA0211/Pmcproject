/** @deprecated Import from ./notifyPmcHead or ./pmcHeadActivityFeed instead. */
export {
  notifyPmcHeadUpdate,
  notifyPmcHeadUpdateSafe,
  buildPmcHeadUpdateCopy,
} from './notifyPmcHead';

export {
  fetchPmcHeadActivityNotifications,
  isSyntheticActivityNotification,
  mergeActivityNotifications,
} from './pmcHeadActivityFeed';

import { notifyPmcHeadUpdateSafe, getCurrentActor } from './notifyPmcHead';
import { MONTH_OPTIONS } from './siteImages';

function monthLabel(month: number): string {
  return MONTH_OPTIONS.find((m) => m.value === month)?.label ?? `Month ${month}`;
}

export async function notifySitePhotoUpload(params: {
  projectName: string;
  month: number;
  year: number;
  photoCount: number;
  senderName?: string;
}): Promise<void> {
  const period = `${monthLabel(params.month)} ${params.year}`;
  const actor = getCurrentActor();
  const title =
    params.photoCount > 1
      ? `${params.photoCount} site photos uploaded`
      : 'Site photo uploaded';
  const message = actor
    ? `${actor.name} · ${actor.roleLabel} uploaded ${params.photoCount} photo${params.photoCount > 1 ? 's' : ''} for ${period} on ${params.projectName}.`
    : `${params.photoCount} photo${params.photoCount > 1 ? 's' : ''} added for ${period} on ${params.projectName}.`;
  notifyPmcHeadUpdateSafe({
    moduleName: 'Site Photos',
    projectName: params.projectName,
    action: 'CREATE',
    title,
    message,
    senderName: params.senderName ?? actor?.name,
    senderRole: actor?.roleLabel,
    notificationType: 'SITE_PHOTO_UPDATE',
  });
}

export async function notifySitePhotoDelete(params: {
  projectName: string;
  month: number;
  year: number;
  senderName?: string;
}): Promise<void> {
  const period = `${monthLabel(params.month)} ${params.year}`;
  notifyPmcHeadUpdateSafe({
    moduleName: 'Site Photos',
    projectName: params.projectName,
    action: 'DELETE',
    title: 'Site photo deleted',
    message: `A site photo was removed for ${period} on ${params.projectName}.`,
    senderName: params.senderName,
    notificationType: 'SITE_PHOTO_UPDATE',
  });
}

/** @deprecated Use fetchPmcHeadActivityNotifications */
export { fetchPmcHeadActivityNotifications as buildSitePhotoActivityNotifications } from './pmcHeadActivityFeed';

export type TeamModuleUpdateParams = {
  moduleName: string;
  projectName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  title: string;
  message: string;
  senderName?: string;
  notificationType?: string;
};

export async function notifyTeamModuleUpdate(params: TeamModuleUpdateParams): Promise<void> {
  notifyPmcHeadUpdateSafe(params);
}
