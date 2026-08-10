/**
 * Open AWS S3 / stored files using URLs already returned by list/detail APIs.
 * Call `/download/` only when no usable direct URL is present (private / presigned).
 */

const DIRECT_URL_KEYS = [
  'file_url',
  'fileUrl',
  'image_url',
  'imageUrl',
  's3_url',
  's3Url',
  'attachment_url',
  'attachmentUrl',
  'document_url',
  'documentUrl',
  'supporting_document_url',
  'supportingDocumentUrl',
  'url',
  'download_url',
  'downloadUrl',
] as const;

export type StoredFileOpenSource = 'direct' | 'presigned_download';

/** Lightweight counters for verification (dev / report). */
export const storedFileOpenMetrics = {
  directOpens: 0,
  downloadEndpointCalls: 0,
  duplicateClicksBlocked: 0,
  lastDirectLatencyMs: 0,
  lastDownloadLatencyMs: 0,
};

export function isUsableStoredFileUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '#' || trimmed.toLowerCase() === 'null') return false;
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('blob:');
}

/** Pick the first usable direct URL from a record or loose fields. */
export function pickDirectStoredFileUrl(
  source?: Record<string, unknown> | null,
  ...extraCandidates: unknown[]
): string | null {
  for (const candidate of extraCandidates) {
    if (isUsableStoredFileUrl(candidate)) return candidate.trim();
  }
  if (!source || typeof source !== 'object') return null;

  for (const key of DIRECT_URL_KEYS) {
    const value = source[key];
    if (isUsableStoredFileUrl(value)) return value.trim();
  }

  // Nested attachment / file objects
  for (const nestKey of ['attachment', 'file', 'document', 'image'] as const) {
    const nested = source[nestKey];
    if (nested && typeof nested === 'object') {
      const found = pickDirectStoredFileUrl(nested as Record<string, unknown>);
      if (found) return found;
    }
  }

  return null;
}

export function openStoredFileInBrowser(
  url: string,
  options?: { fileName?: string | null; download?: boolean },
): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noopener noreferrer';
  anchor.target = '_blank';
  if (options?.download && options.fileName) {
    anchor.download = options.fileName;
  }
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export type ResolveStoredFileUrlInput = {
  /** URL already on the list/detail row (preferred). */
  directUrl?: string | null;
  /** Optional raw API row to scan for URL fields. */
  record?: Record<string, unknown> | null;
  /** Fallback: fetch a presigned URL via `/download/`. */
  fetchPresignedUrl?: () => Promise<string>;
};

/**
 * Resolve a file URL without redundant `/download/` calls.
 * Returns `{ url, source }` so callers can cache the resolved URL.
 */
export async function resolveStoredFileUrl(
  input: ResolveStoredFileUrlInput,
): Promise<{ url: string; source: StoredFileOpenSource }> {
  const direct =
    pickDirectStoredFileUrl(input.record ?? null, input.directUrl) ??
    (isUsableStoredFileUrl(input.directUrl) ? input.directUrl.trim() : null);

  if (direct) {
    const started = performance.now();
    storedFileOpenMetrics.directOpens += 1;
    storedFileOpenMetrics.lastDirectLatencyMs = Math.round(performance.now() - started);
    return { url: direct, source: 'direct' };
  }

  if (!input.fetchPresignedUrl) {
    throw new Error('File URL is not available.');
  }

  const started = performance.now();
  storedFileOpenMetrics.downloadEndpointCalls += 1;
  const url = await input.fetchPresignedUrl();
  storedFileOpenMetrics.lastDownloadLatencyMs = Math.round(performance.now() - started);

  if (!isUsableStoredFileUrl(url)) {
    throw new Error('Download URL was not returned by the server.');
  }
  return { url: url.trim(), source: 'presigned_download' };
}

/**
 * Open a stored file: direct URL first, `/download/` only as fallback.
 * When `busyRef` is provided, concurrent clicks are ignored.
 */
export async function openStoredFile(
  input: ResolveStoredFileUrlInput & {
    fileName?: string | null;
    download?: boolean;
    busyRef?: { current: boolean };
  },
): Promise<{ url: string; source: StoredFileOpenSource }> {
  if (input.busyRef?.current) {
    storedFileOpenMetrics.duplicateClicksBlocked += 1;
    throw new Error('OPEN_IN_PROGRESS');
  }
  if (input.busyRef) input.busyRef.current = true;
  try {
    const resolved = await resolveStoredFileUrl(input);
    openStoredFileInBrowser(resolved.url, {
      fileName: input.fileName,
      download: input.download,
    });
    return resolved;
  } finally {
    if (input.busyRef) input.busyRef.current = false;
  }
}
