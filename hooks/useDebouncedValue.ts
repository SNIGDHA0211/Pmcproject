import { useEffect, useState } from 'react';

/** Default search/filter debounce — avoids API/filter work on every keystroke. */
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * Returns `value` delayed by `delayMs`. Updates cancel prior timers so only the
 * latest value is committed after the user pauses typing.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
