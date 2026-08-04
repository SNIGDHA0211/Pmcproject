import { MONTH_OPTIONS } from './healthSafety';

export { MONTH_OPTIONS };

export const SITE_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

export const SITE_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

/** API max files per upload request. */
export const SITE_IMAGE_MAX_FILES = 20;

/** API max title length. */
export const SITE_IMAGE_TITLE_MAX_LENGTH = 255;

export function buildSiteImageYearOptions(centerYear = new Date().getFullYear()): number[] {
  return Array.from({ length: 6 }, (_, index) => centerYear - 2 + index);
}

export function isAllowedSiteImageFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (SITE_IMAGE_MIME_TYPES.has(mime)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';
}

export function clampSiteImageTitle(value: string): string {
  return (value ?? '').slice(0, SITE_IMAGE_TITLE_MAX_LENGTH);
}

export function getSiteImageDisplayTitle(title?: string | null): string {
  const trimmed = (title ?? '').trim();
  return trimmed || 'Untitled';
}

export function getSiteImageUploaderLabel(image: {
  uploadedBy?: string;
  uploadedByUsername?: string;
}): string {
  return image.uploadedByUsername || image.uploadedBy || '—';
}

export function formatSiteImageUploadDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getLatestSiteImageUploadDate(images: { uploadedAt: string }[]): string {
  if (!images.length) return '—';
  let latest = 0;
  for (const image of images) {
    const time = new Date(image.uploadedAt).getTime();
    if (!Number.isNaN(time) && time > latest) latest = time;
  }
  return latest ? formatSiteImageUploadDate(new Date(latest).toISOString()) : '—';
}

export function downloadSiteImage(imageUrl: string, id: string | number): void {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `site-photo-${id}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
