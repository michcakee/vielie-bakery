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

export function spriteURL(name: string): { url: string; w: number; h: number } {
  const hit = cache.get(name);
  if (hit) return hit;
  const rows = SPRITES[name];
  if (!rows) return EMPTY;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const made = makeCanvas(w, h);
  if (!made) return { ...EMPTY, w, h };
  paint(made[1], [rows], SPRITE_COLORS);
  const out = { url: made[0].toDataURL(), w, h };
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

/** Two-frame sprite sheet (idle/step) for a character, 24×19. */
export function personSheet(look: Look): { url: string; w: number; h: number } {
  const key = `person:${lookKey(look)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const made = makeCanvas(24, 19);
  if (!made) return { url: '', w: 24, h: 19 };
  const colors = personColors(look);
  const hair = HAIR[look.hair % HAIR.length];
  const acc = ACCESSORIES[look.accessory % ACCESSORIES.length];
  const longBehind = look.hair % HAIR.length === 3;
  for (const [i, legs] of [LEGS_A, LEGS_B].entries()) {
    const layers = longBehind ? [hair, [...BODY, ...legs], hair.slice(0, 5), acc] : [[...BODY, ...legs], hair, acc];
    paint(made[1], layers, colors, i * 12, 0);
  }
  const out = { url: made[0].toDataURL(), w: 24, h: 19 };
  cache.set(key, out);
  return out;
}
