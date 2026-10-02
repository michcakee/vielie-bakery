import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './GameContext';

/** Counts smoothly from the previous value to the new one, with a brief up/down tint. */
export function AnimatedNumber({ value, format, className = '' }: { value: number; format: (v: number) => string; className?: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const [flash, setFlash] = useState<'' | 'up' | 'down'>('');
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return;
    setFlash(value > start ? 'up' : 'down');
    const t = window.setTimeout(() => setFlash(''), 900);
    if (reduced) {
      setShown(value);
      return () => window.clearTimeout(t);
    }
    const t0 = performance.now();
    const dur = 700;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(start + (value - start) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      setShown(value);
    };
  }, [value, reduced]);

  return <span className={`num ${flash ? `flash-${flash}` : ''} ${className}`}>{format(shown)}</span>;
}
