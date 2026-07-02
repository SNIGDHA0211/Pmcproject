import type { BackendUserProfile } from './mapBackendUser';

/** Normalize /accounts/me/ and login user payloads (flat or wrapped). */
export function unwrapUserProfile(data: unknown): BackendUserProfile {
  if (!data || typeof data !== 'object') {
    return {};
  }
  const obj = data as Record<string, unknown>;
  if (obj.user && typeof obj.user === 'object') {
    return obj.user as BackendUserProfile;
  }
  if (obj.data && typeof obj.data === 'object') {
    return unwrapUserProfile(obj.data);
  }
  return obj as BackendUserProfile;
}
