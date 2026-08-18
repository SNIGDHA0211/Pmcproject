import { API_ENDPOINTS } from '../config/apiConfig';
import { invalidateApiGetCache } from '../utils/apiGetCache';
import type { CorrespondenceComment } from '../types';
import api, { getApiErrorMessage, unwrapList } from './api';
import { formatUserFacingError } from '../utils/formErrors';

function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  return String(value ?? '').trim();
}

export function normalizeCorrespondenceComment(row: unknown): CorrespondenceComment | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = toNum(r.id);
  if (!id) return null;
  const comment = str(r.comment);
  if (!comment) return null;

  const commentedByRaw = r.commented_by;
  const commentedByObj =
    commentedByRaw && typeof commentedByRaw === 'object'
      ? (commentedByRaw as Record<string, unknown>)
      : null;

  return {
    id,
    comment,
    commented_by: {
      id: toNum(commentedByObj?.id),
      name: str(commentedByObj?.name) || 'Unknown',
    },
    created_at: str(r.created_at),
  };
}

function unwrapCommentsPayload(data: unknown): unknown[] {
  const fromList = unwrapList(data);
  if (fromList.length > 0) return fromList;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.comments)) return obj.comments;
  }
  return [];
}

function commentsCacheFragments(id: string | number): string[] {
  return [
    `/correspondence/${id}/comments`,
    `/correspondence-documents/${id}/comments`,
    `correspondence-comments:${id}`,
  ];
}

export function getCorrespondenceCommentsErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return formatUserFacingError(error, {
    fallback: getApiErrorMessage(error, fallback),
  });
}

export function isSclCommentsBlockedError(error: unknown): boolean {
  const message = getCorrespondenceCommentsErrorMessage(error, '').toLowerCase();
  return (
    message.includes('scl delivered') ||
    message.includes('comments are not available')
  );
}

export async function getCorrespondenceComments(
  id: string | number,
): Promise<CorrespondenceComment[]> {
  const res = await api.get(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.COMMENTS(id));
  return unwrapCommentsPayload(res.data)
    .map((row) => normalizeCorrespondenceComment(row))
    .filter((row): row is CorrespondenceComment => row != null);
}

export async function addCorrespondenceComment(
  id: string | number,
  comment: string,
): Promise<CorrespondenceComment> {
  const res = await api.post(
    API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.COMMENTS(id),
    { comment: comment.trim() },
    { skipActorStamp: true } as never,
  );
  invalidateApiGetCache(commentsCacheFragments(id));

  const payload = res.data as Record<string, unknown> | undefined;
  const data = payload?.data ?? payload;
  const normalized = normalizeCorrespondenceComment(data);
  if (!normalized) {
    throw new Error('Comment was saved but the server response was invalid.');
  }
  return normalized;
}

/** @deprecated Use named exports — kept for symmetry with other correspondence services. */
export const correspondenceCommentsApi = {
  getCorrespondenceComments,
  addCorrespondenceComment,
};
