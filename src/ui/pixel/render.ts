import type { Look } from '../../engine/types';
import { APRONS, HAIR_COLORS, PAL, PANTS, SHIRTS, SKINS, SKIN_SHADE, SPRITE_COLORS } from './palette';
import { SPRITES } from './sprites';

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

const BODY = [
  '............',
  '............',
  '...oooooo...',
  '..osssssso..',
  '..osssssso..',
  '..osesseso..',
  '..ocssssco..',
  '..ossmmsso..',
  '...oSSSSo...',
  '..otttttto..',
  '.otTaaaaTto.',
  '.otTaaaaTto.',
  '.osTaaaaTso.',
  '..oTaaaaTo..',
  '..opAAAApo..',
  '..oppppppo..',
];
const LEGS_A = ['..oppooppo..', '..offooffo..', '...oo..oo...'];
const LEGS_B = ['..offooppo..', '...oo.offo..', '.......oo...'];

const HAIR: string[][] = [
  ['...oooooo...', '..ohhhhhho..', '.ohhHhhhhho.', '.ohhhhhhhho.', '.oh......ho.', '.oh......ho.', '.oh......ho.', '.ohh....hho.', '.oo......oo.'],
  ['....oooo....', '...ohHhho...', '..oohhhhoo..', '.ohhhhhhhho.', '.ohhh..hhho.'],
  ['............', '...oooooo...', '..ohhHhhho..', '.ohhhhhhhho.', '..ohh..hho..', '..oh....ho..'],
  ['...oooooo...', '..ohhhhhho..', '.ohhhhhhhho.', '.ohhHhhhhho.', '.ohh.hh.hho.', '.oh......ho.', '.oh......ho.', '.oh......ho.', '.oh......ho.', '.oh......ho.', '.oh......ho.', '.oo......oo.'],
];

const ACCESSORIES: string[][] = [
  [],
  ['', '', '', '', '...oo..oo...', '.....oo.....'],
  ['', '........pp..', '.......pyp..', '........pp..'],
  ['...oooooo...', '..oGGGGGGo..', '.oGGwGGGGGo.', 'oooooooooooo'],
  ['..owwwwwwo..', '..owwwwwwo..', '..oeeeeeeo..'],
  ['', '...oooooo...', '..orrrrrro..', '.orrrwrrrro.', '.or......ro.'],
];

export const HAIR_STYLES = ['Bob', 'Bun', 'Short', 'Long'];
export const ACCESSORY_NAMES = ['None', 'Glasses', 'Flower clip', 'Helmet', 'Baker\'s hat', 'Headscarf'];

function personColors(look: Look): Record<string, string> {
  const skin = SKINS[look.skin % SKINS.length];
  const shirt = SHIRTS[look.shirt % SHIRTS.length];
  const apron = look.apron >= 0 ? APRONS[look.apron % APRONS.length] : shirt;
  const hair = HAIR_COLORS[look.hairColor % HAIR_COLORS.length];
  return {
    o: PAL.ink,
    e: PAL.ink,
    s: skin,
    S: SKIN_SHADE[look.skin % SKIN_SHADE.length],
    c: '#f29a8e',
    m: '#a8584a',
    t: shirt,
    T: shade(shirt, -0.18),
    a: apron,
    A: shade(apron, -0.15),
    p: PANTS[(look.shirt + look.skin) % PANTS.length],
    f: PAL.inkSoft,
    h: hair,
    H: shade(hair, 0.25),
    G: PAL.forest,
    w: PAL.coconut,
    E: PAL.stone,
    r: PAL.red,
    y: PAL.mango,
    P: PAL.peach,
  };
}

const lookKey = (l: Look) => `${l.skin}.${l.hair}.${l.hairColor}.${l.shirt}.${l.apron}.${l.accessory}`;

/** Person cell: two cells tall, feet on the cell's bottom row. */
export const PERSON_W = 16;
export const PERSON_H = 24;

/** Two-frame sprite sheet (idle/step) for a character, two 16×24 cells side by side. */
export function personSheet(look: Look): { url: string; w: number; h: number } {
  const key = `person:${lookKey(look)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const made = makeCanvas(PERSON_W * 2, PERSON_H);
  if (!made) return { url: '', w: PERSON_W * 2, h: PERSON_H };
  const colors = personColors(look);
  const hair = HAIR[look.hair % HAIR.length];
  const acc = ACCESSORIES[look.accessory % ACCESSORIES.length];
  const longBehind = look.hair % HAIR.length === 3;
  for (const [i, legs] of [LEGS_A, LEGS_B].entries()) {
    const layers = longBehind ? [hair, [...BODY, ...legs], hair.slice(0, 5), acc] : [[...BODY, ...legs], hair, acc];
    paint(made[1], layers, colors, i * PERSON_W + 2, PERSON_H - 19);
  }
  const out = { url: made[0].toDataURL(), w: PERSON_W * 2, h: PERSON_H };
  cache.set(key, out);
  return out;
}
