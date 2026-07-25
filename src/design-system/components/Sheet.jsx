import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './IconButton.jsx';
import './Sheet.css';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Sheet({ open = false, onClose, title, children, style }) {
  const previouslyFocusedRef = useRef(null);
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previouslyFocusedRef.current = document.activeElement;
    const sheetNode = sheetRef.current;
    sheetNode?.querySelector(FOCUSABLE_SELECTOR)?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }

      if (event.key !== 'Tab' || !sheetNode) {
        return;
      }

      const focusableElements = sheetNode.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusableElements.length === 0) {
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const sheetRoot = typeof document !== 'undefined' ? document.getElementById('sheet-root') : null;
  if (!sheetRoot) {
    return null;
  }

  return createPortal(
    <div
      className="vds-sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
    >
      <div className="vds-sheet-backdrop" onClick={onClose} />
      <div className="vds-sheet" ref={sheetRef} style={style}>
        <div className="vds-sheet-handle" />
        <div className="vds-sheet-header">
          <span className="vds-sheet-title">{title}</span>
          {onClose ? <IconButton icon="x" variant="ghost" size="sm" label="Close" onClick={onClose} /> : null}
        </div>
        {children}
      </div>
    </div>,
    sheetRoot,
  );
}
