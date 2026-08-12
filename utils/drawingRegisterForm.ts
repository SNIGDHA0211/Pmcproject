/** Allowed drawing register attachment extensions (backend contract). */
export const DRAWING_REGISTER_ALLOWED_EXT = [
  '.pdf',
  '.dwg',
  '.dxf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
] as const;

export const DRAWING_REGISTER_MAX_BYTES = 100 * 1024 * 1024;

export function formatDrawingFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDrawingFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

/** Validate pending uploads before multipart POST/PATCH. */
export function validateDrawingRegisterFiles(files: File[]): string | null {
  for (const file of files) {
    const ext = getDrawingFileExtension(file.name);
    if (!DRAWING_REGISTER_ALLOWED_EXT.includes(ext as (typeof DRAWING_REGISTER_ALLOWED_EXT)[number])) {
      return `${file.name}: unsupported file type. Allowed: ${DRAWING_REGISTER_ALLOWED_EXT.join(', ')}`;
    }
    if (file.size > DRAWING_REGISTER_MAX_BYTES) {
      return `${file.name}: exceeds 100 MB limit.`;
    }
  }
  return null;
}
