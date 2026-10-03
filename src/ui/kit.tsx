import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { NOTEBOOK } from '../data/notebook';
import { play } from './audio';
import { Sprite } from './pixel/Sprite';

export function Btn({
  children,
  onClick,
  kind = 'plain',
  disabled,
  title,
  className = '',
  sfx = 'click',
  type = 'button',
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: 'plain' | 'primary' | 'go' | 'danger' | 'ghost';
  disabled?: boolean;
  title?: string;
  className?: string;
  sfx?: Parameters<typeof play>[0] | null;
  type?: 'button' | 'submit';
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  /** Anchor for the intro-quest spotlight. */
  'data-spot'?: string;
}) {
  const [popping, setPopping] = useState(false);
  return (
    <button
      type={type}
      className={`btn btn-${kind} ${className} ${popping ? 'popping' : ''}`}
      disabled={disabled}
      title={title}
      onAnimationEnd={() => setPopping(false)}
      onClick={() => {
        if (sfx) play(sfx);
        setPopping(true);
        onClick?.();
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Meter({ value, tone = 'good', label }: { value: number; tone?: 'great' | 'good' | 'meh' | 'bad' | 'eco' | 'heart' | 'xp'; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className={`meter meter-${tone}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)}>
      <span className="meter-fill" style={{ width: `${v * 100}%` }} />
      {Array.from({ length: 9 }).map((_, i) => (
        <i key={i} style={{ left: `${(i + 1) * 10}%` }} />
      ))}
    </span>
  );
}

export function Stepper({ value, onChange, step, min, max, format, label, disabled }: { value: number; onChange: (v: number) => void; step: number; min: number; max: number; format: (v: number) => string; label: string; disabled?: boolean }) {
  return (
    <span className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Less ${label}`} disabled={disabled || value - step < min - 1e-9} onClick={() => (play('click'), onChange(Math.round((value - step) * 100) / 100))}>
        −
      </button>
      <output aria-live="polite">{format(value)}</output>
      <button type="button" aria-label={`More ${label}`} disabled={disabled || value + step > max + 1e-9} onClick={() => (play('click'), onChange(Math.round((value + step) * 100) / 100))}>
        +
      </button>
    </span>
  );
}

/** A friendly word with a one-line explanation on hover, focus or tap. */
export function Tip({ concept, children }: { concept: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const note = NOTEBOOK[concept];
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  if (!note) return <>{children}</>;
  return (
    <span className="tip" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="tip-term" aria-describedby={open ? id : undefined} onClick={() => setOpen((o) => !o)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        {children}
      </button>
      {open && (
        <span role="tooltip" id={id} className="tip-pop">
          <b>{note.term}</b> {note.text}
        </span>
      )}
    </span>
  );
}

export function Stars({ value, label }: { value: number; label: string }) {
  const full = Math.round(value * 2) / 2;
  return (
    <span className="stars" role="img" aria-label={`${label}: ${full} of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i + 1 <= full ? 'on' : i + 0.5 === full ? 'half' : 'off'}>
          <Sprite name="star" scale={2} />
        </span>
      ))}
    </span>
  );
}

export function Card({ children, className = '', title, icon, aside, spot, fresh }: { children: ReactNode; className?: string; title?: ReactNode; icon?: string; aside?: ReactNode; spot?: string; fresh?: boolean }) {
  return (
    <section className={`card ${className}`} data-spot={spot}>
      {title && (
        <header className="card-head">
          {icon && <Sprite name={icon} scale={2} />}
          <h3>{title}</h3>
          {fresh && <span className="new-chip">NEW</span>}
          {aside && <span className="card-aside">{aside}</span>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="empty">
      <Sprite name={icon} scale={3} />
      <p>{children}</p>
    </div>
  );
}

/** Counts smoothly to a new number so money changes feel alive. */
export function useTween(target: number, ms = 450, still = false): number {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (still) {
      setV(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const val = a + (target - a) * (1 - (1 - k) ** 3);
      setV(val);
      from.current = val;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, still]);
  return v;
}
