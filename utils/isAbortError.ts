/** True when a request was cancelled via AbortController / axios cancel. */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { name?: string; code?: string; message?: string };
  if (err.name === 'CanceledError' || err.name === 'AbortError') return true;
  if (err.code === 'ERR_CANCELED') return true;
  if (typeof err.message === 'string' && /abort|cancel/i.test(err.message)) return true;
  return false;
}
