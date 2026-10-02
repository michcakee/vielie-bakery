import type { CSSProperties } from 'react';
import type { Look } from '../../engine/types';
import { personSheet, spriteURL } from './render';

interface Props {
  name: string;
  scale?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** A crisp pixel sprite. Decorative unless given a label. */
export function Sprite({ name, scale = 2, label, className, style }: Props) {
  const s = spriteURL(name);
  if (!s.url) return <span className={className} style={{ display: 'inline-block', width: s.w * scale, height: s.h * scale, ...style }} aria-hidden={!label} />;
  return (
    <img
      src={s.url}
      width={s.w * scale}
      height={s.h * scale}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      className={`px ${className ?? ''}`}
      style={style}
      draggable={false}
    />
  );
}

/** A character, drawn from a two-frame sheet; `walking` alternates frames. */
export function Person({ look, scale = 2, walking = false, className, style, label }: { look: Look; scale?: number; walking?: boolean; className?: string; style?: CSSProperties; label?: string }) {
  const s = personSheet(look);
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`person-sprite ${walking ? 'is-walking' : ''} ${className ?? ''}`}
      style={{
        width: 12 * scale,
        height: s.h * scale,
        backgroundImage: s.url ? `url(${s.url})` : undefined,
        backgroundSize: `${24 * scale}px ${s.h * scale}px`,
        ['--step' as string]: `${-12 * scale}px`,
        ...style,
      }}
    />
  );
}
