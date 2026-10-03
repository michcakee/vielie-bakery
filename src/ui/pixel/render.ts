import type { Look } from '../../engine/types';
import { SPRITE_COLORS } from './palette';
import { SPRITES } from './sprites';
import { CHIBI_H, CHIBI_W, paintChibi } from './chibi';

const cache = new Map<string, { url: string; w: number; h: number }>();

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Paint character-grid layers onto a canvas; later layers draw over earlier ones. */
export function paint(ctx: CanvasRenderingContext2D, layers: string[][], colors: Record<string, string>, ox = 0, oy = 0) {
  for (const rows of layers) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = colors[row[x]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    });
  }
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  return ctx ? [cv, ctx] : null;
}

const EMPTY = { url: '', w: 16, h: 16 };

/** Burnt food: every warm colour drops to its charred neighbour. */
const BURNT: Record<string, string> = { y: 'K', Y: 'K', k: 'K', K: 'N', b: 'N', n: 'N', w: 'E', c: 'E', e: 'E', l: 'G', g: 'G', G: 'o', p: 'u', P: 'u', r: 'R', R: 'o', i: 'E', I: 'E', t: 'G' };

function variantRows(rows: string[], variant: string | undefined, w: number): string[] {
  if (variant === 'burnt') return rows.map((r) => [...r].map((ch) => BURNT[ch] ?? ch).join(''));
  if (variant === 'perfect') {
    // a few sparkle pixels in the empty corners
    const out = rows.map((r) => r.padEnd(w, '.'));
    const dots: [number, number][] = [[1, 1], [w - 2, 2], [2, rows.length - 3], [w - 3, rows.length - 2]];
    for (const [x, y] of dots) if (out[y] && out[y][x] === '.') out[y] = out[y].slice(0, x) + 'y' + out[y].slice(x + 1);
    return out;
  }
  return rows;
}

/**
 * Every sprite is drawn into a fixed cell so items line up: 16-wide art becomes a 16×16 cell,
 * 8-wide icons an 8×8 cell (centred); other props keep their size. `name:burnt` and
 * `name:perfect` are variants of the same drawing.
 */
export function spriteURL(name: string): { url: string; w: number; h: number } {
  const hit = cache.get(name);
  if (hit) return hit;
  const [base, variant] = name.split(':');
  const raw = SPRITES[base];
  if (!raw) return EMPTY;
  const w = Math.max(...raw.map((r) => r.length));
  const h = raw.length;
  const cw = w === 16 ? 16 : w === 8 ? 8 : w;
  const ch = w === 16 ? 16 : w === 8 ? 8 : h;
  const made = makeCanvas(cw, ch);
  if (!made) return { ...EMPTY, w: cw, h: ch };
  paint(made[1], [variantRows(raw, variant, w)], SPRITE_COLORS, Math.floor((cw - w) / 2), Math.floor((ch - h) / 2));
  const out = { url: made[0].toDataURL(), w: cw, h: ch };
  cache.set(name, out);
  return out;
}

// ------------------------------------------------------------------ people

export const HAIR_STYLES = ['Bob', 'Bun', 'Short', 'Long', 'Pigtails'];
export const ACCESSORY_NAMES = ['None', 'Glasses', 'Bow', 'Helmet', 'Baker\'s hat', 'Headscarf', 'Nón lá', 'Headphones', 'Heart clips'];

const lookKey = (l: Look) => `${l.skin}.${l.hair}.${l.hairColor}.${l.shirt}.${l.apron}.${l.accessory}`;

/** Person cell: 24×36, feet on the bottom row. */
export const PERSON_W = CHIBI_W;
export const PERSON_H = CHIBI_H;

/** Sprite sheet for a character: stand and step side by side, front view on top and back view below. `h` is one cell. */
export function personSheet(look: Look): { url: string; w: number; h: number } {
  const key = `person:${lookKey(look)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const made = makeCanvas(PERSON_W * 2, PERSON_H * 2);
  if (!made) return { url: '', w: PERSON_W * 2, h: PERSON_H };
  paintChibi(made[1], look);
  const out = { url: made[0].toDataURL(), w: PERSON_W * 2, h: PERSON_H };
  cache.set(key, out);
  return out;
}
