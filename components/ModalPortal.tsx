import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  open: boolean;
  children: React.ReactNode;
}

/**
 * Renders modals on document.body so position:fixed centers in the viewport
 * (ancestors with transform/filter/backdrop-filter break fixed positioning).
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ open, children }) => {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};
