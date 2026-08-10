import api, { getApiErrorMessage, toNum } from './api';
import { API_ENDPOINTS } from '../config/apiConfig';
import { invalidateApiGetCache } from '../utils/apiGetCache';
import {
  isTutorialSectionKey,
  type TutorialOrdering,
  type TutorialSectionKey,
  TUTORIAL_DEFAULT_ORDERING,
  TUTORIAL_DEFAULT_PAGE_SIZE,
  TUTORIAL_MAX_PAGE_SIZE,
} from '../utils/tutorialVideosSections';

export type TutorialVideoStatus = 'processing' | 'ready' | 'failed' | string;

export type TutorialVideo = {
  id: number;
  title: string;
  description: string;
  section: TutorialSectionKey | string;
  section_name: string;
  status: TutorialVideoStatus;
  /** Backend processing_error / error_message when provided */
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  duration_seconds?: number | null;
  file_size?: number | null;
  width?: number | null;
  height?: number | null;
};

export type TutorialVideoListParams = {
  section: TutorialSectionKey;
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: TutorialOrdering;
};

export type TutorialVideoListResult = {
  count: number;
  next: string | null;
  previous: string | null;
  data: TutorialVideo[];
  message?: string;
};

export type TutorialVideoPlayback = {
  id: number;
  title: string;
  video_url: string;
};

export type TutorialVideoUploadInput = {
  title: string;
  description: string;
  section: TutorialSectionKey;
  upload: File;
};

export type TutorialVideoUpdateInput = {
  title?: string;
  description?: string;
  section?: TutorialSectionKey;
};

/**
 * Clear default application/json so the browser sets multipart boundary.
 * Setting `multipart/form-data` without a boundary breaks file uploads.
 */
const multipartUploadConfig = {
  headers: { 'Content-Type': undefined as unknown as string },
} as const;

/** In-memory playback URL cache for the current session (not localStorage). */
const playbackUrlCache = new Map<number, string>();

/** Collapse concurrent detail GETs for the same id (polling must not stampede). */
const detailInflight = new Map<number, Promise<TutorialVideo>>();

function str(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  return String(v).trim();
}

function strOrNull(v: unknown): string | null {
  const s = str(v);
  return s || null;
}

function clampPageSize(size?: number): number {
  const n = Math.floor(Number(size) || TUTORIAL_DEFAULT_PAGE_SIZE);
  if (n < 1) return TUTORIAL_DEFAULT_PAGE_SIZE;
  return Math.min(n, TUTORIAL_MAX_PAGE_SIZE);
}

export function normalizeTutorialVideo(row: unknown): TutorialVideo | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = toNum(r.id ?? r.pk);
  if (!id) return null;
  const sectionRaw = str(r.section);
  const section = isTutorialSectionKey(sectionRaw) ? sectionRaw : sectionRaw;
  return {
    id,
    title: str(r.title) || 'Untitled tutorial',
    description: str(r.description),
    section,
    section_name: str(r.section_name) || sectionRaw,
    status: str(r.status, 'processing') || 'processing',
    error_message:
      strOrNull(r.processing_error) ||
      strOrNull(r.error_message) ||
      strOrNull(r.failure_reason) ||
      strOrNull(r.error),
    created_at: strOrNull(r.created_at),
    updated_at: strOrNull(r.updated_at),
    duration_seconds: (() => {
      const n = Number(r.duration_seconds);
      return Number.isFinite(n) ? n : null;
    })(),
    file_size: (() => {
      const n = Number(r.file_size);
      return Number.isFinite(n) ? n : null;
    })(),
    width: (() => {
      const n = Number(r.width);
      return Number.isFinite(n) ? n : null;
    })(),
    height: (() => {
      const n = Number(r.height);
      return Number.isFinite(n) ? n : null;
    })(),
  };
}

function unwrapEnvelope(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  return raw as Record<string, unknown>;
}

/** Backend list shape: { success, count, next, previous, data: [] } — not results. */
export function normalizeTutorialVideoList(raw: unknown): TutorialVideoListResult {
  const body = unwrapEnvelope(raw);
  const listSource = Array.isArray(body.data)
    ? body.data
    : Array.isArray(body.results)
      ? body.results
      : [];
  const data = listSource
    .map((row) => normalizeTutorialVideo(row))
    .filter((row): row is TutorialVideo => row != null);

  return {
    count: toNum(body.count) || data.length,
    next: typeof body.next === 'string' ? body.next : body.next == null ? null : String(body.next),
    previous:
      typeof body.previous === 'string'
        ? body.previous
        : body.previous == null
          ? null
          : String(body.previous),
    data,
    message: str(body.message) || undefined,
  };
}

export function normalizeTutorialVideoPlayback(raw: unknown): TutorialVideoPlayback | null {
  const body = unwrapEnvelope(raw);
  const payload =
    body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : body;
  const id = toNum(payload.id);
  const video_url = str(payload.video_url);
  if (!id || !video_url) return null;
  return {
    id,
    title: str(payload.title) || 'Tutorial',
    video_url,
  };
}

/** Invalidate GET cache for one section's list queries (params include section). */
export function invalidateTutorialVideosSection(section: string): void {
  invalidateApiGetCache([`"section","${section}"`]);
}

export function invalidateTutorialVideoDetail(id: number | string): void {
  invalidateApiGetCache([`/tutorial-videos/${id}/`]);
}

export function clearTutorialPlaybackCache(id?: number): void {
  if (id == null) {
    playbackUrlCache.clear();
    return;
  }
  playbackUrlCache.delete(id);
}

export function getCachedTutorialPlaybackUrl(id: number): string | null {
  return playbackUrlCache.get(id) ?? null;
}

export function cacheTutorialPlaybackUrl(id: number, url: string): void {
  if (id && url) playbackUrlCache.set(id, url);
}

export function getTutorialVideosErrorMessage(
  error: unknown,
  fallback = 'Unable to load tutorials.',
): string {
  return getApiErrorMessage(error, fallback);
}

export const tutorialVideosApi = {
  async getTutorialVideos(
    section: TutorialSectionKey,
    params?: Omit<TutorialVideoListParams, 'section'>,
  ): Promise<TutorialVideoListResult> {
    const page = Math.max(1, Math.floor(Number(params?.page) || 1));
    const page_size = clampPageSize(params?.page_size);
    const search = str(params?.search);
    const ordering = (params?.ordering || TUTORIAL_DEFAULT_ORDERING) as TutorialOrdering;

    const res = await api.get(API_ENDPOINTS.TUTORIAL_VIDEOS.LIST, {
      params: {
        section,
        page,
        page_size,
        ordering,
        ...(search ? { search } : {}),
      },
    });
    return normalizeTutorialVideoList(res.data);
  },

  async getTutorialVideo(id: number | string): Promise<TutorialVideo> {
    const numericId = toNum(id);
    if (numericId) {
      const pending = detailInflight.get(numericId);
      if (pending) return pending;
    }

    const request = (async () => {
      const res = await api.get(API_ENDPOINTS.TUTORIAL_VIDEOS.DETAIL(id), {
        // Polling must not reuse stale processing responses forever
        skipGetCache: true,
      } as never);
      const body = unwrapEnvelope(res.data);
      const row =
        body.data && typeof body.data === 'object' ? body.data : body;
      const normalized = normalizeTutorialVideo(row);
      if (!normalized) {
        throw new Error('Tutorial video not found.');
      }
      return normalized;
    })();

    if (numericId) {
      detailInflight.set(numericId, request);
      request.finally(() => {
        if (detailInflight.get(numericId) === request) {
          detailInflight.delete(numericId);
        }
      });
    }

    return request;
  },

  async getTutorialVideoPlaybackUrl(id: number | string): Promise<TutorialVideoPlayback> {
    const numericId = toNum(id);
    if (numericId) {
      const cached = getCachedTutorialPlaybackUrl(numericId);
      if (cached) {
        return { id: numericId, title: '', video_url: cached };
      }
    }

    const res = await api.get(API_ENDPOINTS.TUTORIAL_VIDEOS.VIEW(id), {
      skipGetCache: true,
    } as never);
    const playback = normalizeTutorialVideoPlayback(res.data);
    if (!playback) {
      throw new Error('Unable to open tutorial video.');
    }
    cacheTutorialPlaybackUrl(playback.id, playback.video_url);
    return playback;
  },

  async uploadTutorialVideo(input: TutorialVideoUploadInput): Promise<TutorialVideo> {
    const formData = new FormData();
    formData.append('title', input.title.trim());
    formData.append('description', (input.description || '').trim());
    formData.append('section', input.section);
    formData.append('upload', input.upload);

    const res = await api.post(API_ENDPOINTS.TUTORIAL_VIDEOS.LIST, formData, {
      ...multipartUploadConfig,
      // Defense in depth: never inject actor stamp keys into tutorial FormData.
      skipActorStamp: true,
    } as never);
    const body = unwrapEnvelope(res.data);
    const row =
      body.data && typeof body.data === 'object' ? body.data : body;
    const normalized = normalizeTutorialVideo(row);
    if (!normalized) {
      throw new Error('Upload succeeded but the response was incomplete.');
    }
    invalidateTutorialVideosSection(input.section);
    return normalized;
  },

  async updateTutorialVideo(
    id: number | string,
    data: TutorialVideoUpdateInput,
  ): Promise<TutorialVideo> {
    const payload: Record<string, string> = {};
    if (data.title !== undefined) payload.title = data.title.trim();
    if (data.description !== undefined) payload.description = data.description.trim();
    if (data.section !== undefined) payload.section = data.section;

    const res = await api.patch(API_ENDPOINTS.TUTORIAL_VIDEOS.DETAIL(id), payload);
    const body = unwrapEnvelope(res.data);
    const row =
      body.data && typeof body.data === 'object' ? body.data : body;
    const normalized = normalizeTutorialVideo(row);
    if (!normalized) {
      throw new Error('Update succeeded but the response was incomplete.');
    }
    invalidateTutorialVideoDetail(id);
    if (data.section) invalidateTutorialVideosSection(data.section);
    if (normalized.section) invalidateTutorialVideosSection(String(normalized.section));
    clearTutorialPlaybackCache(toNum(id) || undefined);
    return normalized;
  },

  async deleteTutorialVideo(id: number | string, section?: string): Promise<void> {
    await api.delete(API_ENDPOINTS.TUTORIAL_VIDEOS.DETAIL(id));
    invalidateTutorialVideoDetail(id);
    if (section) invalidateTutorialVideosSection(section);
    clearTutorialPlaybackCache(toNum(id) || undefined);
  },

  /** Re-queue a failed tutorial when the backend still has the temp S3 object. */
  async reprocessTutorialVideo(id: number | string, section?: string): Promise<TutorialVideo> {
    const res = await api.post(
      API_ENDPOINTS.TUTORIAL_VIDEOS.REPROCESS(id),
      {},
      { skipActorStamp: true } as never,
    );
    const body = unwrapEnvelope(res.data);
    const row =
      body.data && typeof body.data === 'object' ? body.data : body;
    const normalized = normalizeTutorialVideo(row);
    if (!normalized) {
      // Some backends return 202 with minimal body — treat as processing again.
      return {
        id: toNum(id),
        title: 'Tutorial',
        description: '',
        section: section || '',
        section_name: section || '',
        status: 'processing',
        error_message: null,
      };
    }
    invalidateTutorialVideoDetail(id);
    if (section) invalidateTutorialVideosSection(section);
    if (normalized.section) invalidateTutorialVideosSection(String(normalized.section));
    clearTutorialPlaybackCache(toNum(id) || undefined);
    return normalized;
  },
};
