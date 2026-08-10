/** Lightweight cross-component notify when a section's tutorials change status. */

const EVENT = 'pmc-tutorial-section-updated';

export function emitTutorialSectionUpdated(section: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(EVENT, { detail: { section: String(section).toLowerCase() } }),
  );
}

export function subscribeTutorialSectionUpdated(
  section: string,
  onUpdate: () => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const target = String(section).toLowerCase();
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ section?: string }>).detail;
    if (!detail?.section || detail.section === target) onUpdate();
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
