import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CONCEPTS } from '../game/education';
import type { ConceptId } from '../game/types';
import { useGame } from './GameContext';

/**
 * A word with a dotted underline. Clicking it explains the idea in plain language
 * and adds it to the Economics Notebook.
 */
export function Term({ concept, children }: { concept: ConceptId; children?: ReactNode }) {
  const { dispatch } = useGame();
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const c = CONCEPTS[concept];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="term" ref={ref}>
      <button
        type="button"
        className="term-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen((o) => !o);
          dispatch({ type: 'learn', concept });
        }}
      >
        {children ?? c.term}
      </button>
      {open && (
        <span className="term-pop" id={id} role="note">
          <strong>{c.term}</strong>
          <span>{c.short}</span>
          <em>{c.example}</em>
        </span>
      )}
    </span>
  );
}
