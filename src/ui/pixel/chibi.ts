import type { Look } from '../../engine/types';
import { APRONS, HAIR_COLORS, PANTS, SHIRTS, SKINS, SKIN_SHADE } from './palette';

/**
 * Characters are drawn by code, not typed out as grids: shapes (ellipses, rows of pixels) go
 * onto a 24×36 pixel grid with a region tag each, then three passes add the anime-sprite finish:
 * a shine ring and lower shadow in the hair, dark lines where hair meets skin and cloth meets
 * skin, and a dark outline all round. That gives round heads, shaded hair and big eyes at a
 * size hand-typed rows can't manage.
 */
export const CHIBI_W = 24;
export const CHIBI_H = 36;

type Region = 'hair' | 'skin' | 'cloth' | 'apron' | 'eye' | 'acc' | 'leg' | 'shoe';
interface Px {
  c: string;
  r: Region;
}

const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
/** Blend colour a toward colour b by t (0..1). */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${f(ar, br)}${f(ag, bg)}${f(ab, bb)}`;
}

const INK = '#2a1f33';
const EYES = ['#7a4a2a', '#c0503a', '#3f6fb5', '#4f9a5b', '#8e5bb5', '#d98a1f', '#c2477a'];
/** Dark natural hair gets brown or amber eyes; dyed hair gets a colour to match. */
const EYE_FOR_HAIR = [0, 0, 5, 1, 6, 3, 2, 6, 4, 3, 5];

class Grid {
  cells: (Px | null)[] = new Array(CHIBI_W * CHIBI_H).fill(null);
  get(x: number, y: number): Px | null {
    return x < 0 || y < 0 || x >= CHIBI_W || y >= CHIBI_H ? null : this.cells[y * CHIBI_W + x];
  }
  set(x: number, y: number, c: string, r: Region) {
    if (x < 0 || y < 0 || x >= CHIBI_W || y >= CHIBI_H) return;
    this.cells[y * CHIBI_W + x] = { c, r };
  }
  row(y: number, x0: number, x1: number, c: string, r: Region) {
    for (let x = x0; x <= x1; x++) this.set(x, y, c, r);
  }
  rect(x0: number, y0: number, x1: number, y1: number, c: string, r: Region) {
    for (let y = y0; y <= y1; y++) this.row(y, x0, x1, c, r);
  }
  /** Filled ellipse; `keep` limits which pixels are painted. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string, r: Region, keep?: (x: number, y: number) => boolean) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d <= 1 && (!keep || keep(x, y))) this.set(x, y, c, r);
      }
  }
}

const CX = 11.5;
/** How far down the fringe comes at each column across the face (x = 4..19): a jagged anime fringe. */
const FRINGE = [13, 13, 14, 13, 12, 13, 14, 13, 12, 12, 13, 14, 13, 13, 14, 13];
const SWEPT = [14, 14, 14, 13, 13, 13, 12, 12, 12, 11, 11, 12, 12, 13, 13, 12];
const PARTED = [14, 14, 13, 13, 12, 12, 11, 10, 10, 11, 12, 12, 13, 13, 14, 14];

interface HairStyle {
  /** The big shape behind the head. */
  rx: number;
  ry: number;
  cy: number;
  fringe: number[];
  extra?: (g: Grid, hair: string) => void;
  /** Drawn behind the body (long hair). */
  back?: (g: Grid, hair: string) => void;
}

const STYLES: HairStyle[] = [
  // Bob: full and round, curling in at the chin
  { rx: 10.4, ry: 9.6, cy: 13, fringe: FRINGE },
  // Bun: neat, with a round knot on top
  { rx: 9.4, ry: 8.6, cy: 12.5, fringe: PARTED, extra: (g, h) => g.ellipse(CX, 3.4, 3.4, 3, h, 'hair') },
  // Short: side-swept
  { rx: 9.4, ry: 8.4, cy: 12, fringe: SWEPT },
  // Long: down past the shoulders
  {
    rx: 10.4,
    ry: 9.6,
    cy: 13,
    fringe: FRINGE,
    back: (g, h) => {
      g.rect(2, 13, 21, 28, h, 'hair');
      g.row(29, 3, 20, h, 'hair');
      g.row(30, 4, 8, h, 'hair');
      g.row(30, 15, 19, h, 'hair');
    },
  },
  // Pigtails: two big tails with pink ties, and one curl that won't stay down
  {
    rx: 10,
    ry: 9.2,
    cy: 12.6,
    fringe: FRINGE,
    back: (g, h) => {
      g.ellipse(2.2, 20, 2.6, 6.5, h, 'hair');
      g.ellipse(20.8, 20, 2.6, 6.5, h, 'hair');
    },
    extra: (g, h) => {
      g.rect(1, 13, 3, 14, '#d97a62', 'acc');
      g.rect(20, 13, 22, 14, '#d97a62', 'acc');
      g.set(12, 2, h, 'hair');
      g.set(13, 1, h, 'hair');
      g.set(14, 1, h, 'hair');
      g.set(15, 2, h, 'hair');
    },
  },
];

function accessory(g: Grid, id: number, back = false) {
  // From behind, things worn on the face or the fringe can't be seen.
  if (back && (id === 1 || id === 8)) return;
  switch (id) {
    case 1: {
      // Glasses: thin frames round both eyes and a bridge
      const ink = '#4a3b52';
      for (const x0 of [5, 13]) {
        g.row(14, x0 + 1, x0 + 4, ink, 'acc');
        g.row(19, x0 + 1, x0 + 4, ink, 'acc');
        for (let y = 15; y <= 18; y++) {
          g.set(x0, y, ink, 'acc');
          g.set(x0 + 5, y, ink, 'acc');
        }
      }
      g.row(16, 11, 12, ink, 'acc');
      break;
    }
    case 2: {
      // Bow, up on one side
      const c = '#e2506a';
      g.rect(14, 3, 16, 7, c, 'acc');
      g.rect(19, 3, 21, 7, c, 'acc');
      g.rect(16, 4, 19, 6, c, 'acc');
      g.rect(17, 4, 18, 6, '#b83350', 'acc');
      g.set(15, 4, '#f7a3b3', 'acc');
      g.set(20, 4, '#f7a3b3', 'acc');
      break;
    }
    case 3: {
      // Moto helmet
      const c = '#4f7d46';
      g.ellipse(CX, 10, 10.8, 8.4, c, 'acc', (_x, y) => y <= 11);
      g.row(12, 1, 22, mix(c, INK, 0.45), 'acc');
      g.row(5, 6, 9, mix(c, '#ffffff', 0.6), 'acc');
      g.row(6, 5, 6, mix(c, '#ffffff', 0.6), 'acc');
      break;
    }
    case 4: {
      // Baker's hat: a puffy top and a band
      g.ellipse(CX, 3.5, 8, 3.6, '#ffffff', 'acc');
      g.rect(5, 5, 18, 8, '#ffffff', 'acc');
      g.row(8, 5, 18, '#e2d6b4', 'acc');
      for (const x of [8, 12, 16]) g.rect(x, 5, x, 6, '#e6e0d6', 'acc');
      break;
    }
    case 5: {
      // Headscarf with a knot under the chin side
      const c = '#d7625a';
      g.ellipse(CX, 11, 10.6, 9, c, 'acc', (x, y) => back || y <= 10 || x <= 3 || x >= 20);
      for (const [x, y] of [[6, 5], [11, 4], [16, 6], [8, 8], [14, 8]]) g.set(x, y, '#f7c9c2', 'acc');
      break;
    }
    case 6: {
      // Nón lá: a wide straw cone
      const c = '#e8d39a';
      for (let y = 0; y <= 8; y++) {
        const half = 1 + y * 1.35;
        g.row(y, Math.round(CX - half), Math.round(CX + half), c, 'acc');
      }
      for (let y = 2; y <= 8; y += 2) g.row(y, Math.round(CX - y * 1.1), Math.round(CX - y * 1.1) + 1, '#cdb275', 'acc');
      g.row(8, 0, 23, '#cdb275', 'acc');
      break;
    }
    case 7: {
      // Headphones
      const c = '#8fd0e6';
      g.ellipse(CX, 12, 11, 10.4, c, 'acc', (x, y) => y <= 9 && ((x - CX) / 9.6) ** 2 + ((y - 12) / 9) ** 2 > 1);
      g.rect(0, 13, 2, 18, c, 'acc');
      g.rect(21, 13, 23, 18, c, 'acc');
      g.set(1, 14, '#e3f4fa', 'acc');
      g.set(22, 14, '#e3f4fa', 'acc');
      break;
    }
    case 8: {
      // Heart clips
      const c = '#f0608a';
      for (const [x, y] of [[4, 7], [5, 7], [7, 7], [8, 7], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [5, 9], [6, 9], [7, 9], [6, 10]]) g.set(x, y, c, 'acc');
      g.set(4, 7, '#f9b3c8', 'acc');
      break;
    }
  }
}

function drawPerson(look: Look, step: boolean, back = false): Grid {
  const g = new Grid();
  const skin = SKINS[look.skin % SKINS.length];
  const skinShade = SKIN_SHADE[look.skin % SKIN_SHADE.length];
  const hair = HAIR_COLORS[look.hairColor % HAIR_COLORS.length];
  const shirt = SHIRTS[look.shirt % SHIRTS.length];
  const apron = look.apron >= 0 ? APRONS[look.apron % APRONS.length] : null;
  const bottoms = PANTS[(look.shirt + look.skin) % PANTS.length];
  const eye = EYES[EYE_FOR_HAIR[look.hairColor % EYE_FOR_HAIR.length]];
  const style = STYLES[look.hair % STYLES.length];

  // 1. hair that hangs behind the body (seen from the front)
  if (!back) {
    style.back?.(g, hair);
    g.ellipse(CX, style.cy, style.rx, style.ry, hair, 'hair');
  }

  // 2. body: neck, shirt with a collar, arms and hands, apron, skirt, legs, shoes
  g.rect(10, 22, 13, 23, skinShade, 'skin');
  g.row(23, 7, 16, shirt, 'cloth');
  g.rect(6, 24, 17, 28, shirt, 'cloth');
  g.rect(8, 29, 15, 30, shirt, 'cloth');
  g.rect(15, 25, 15, 30, mix(shirt, INK, 0.16), 'cloth');
  if (!back) {
    g.row(23, 11, 12, skin, 'skin');
    g.set(10, 23, '#ffffff', 'cloth');
    g.set(13, 23, '#ffffff', 'cloth');
    g.set(11, 24, '#ffffff', 'cloth');
    g.set(12, 24, '#ffffff', 'cloth');
    for (const y of [26, 28]) g.set(11, y, mix(shirt, '#ffffff', 0.55), 'cloth');
  } else g.row(23, 10, 13, '#ffffff', 'cloth');
  // arms hang at the sides; on the step frame one swings forward
  g.rect(5, 25, 6, 28, shirt, 'cloth');
  g.rect(17, 25, 18, 28, shirt, 'cloth');
  g.rect(5, step ? 28 : 29, 6, step ? 29 : 30, skin, 'skin');
  g.rect(17, 29, 18, step ? 29 : 30, skin, 'skin');
  if (apron && !back) {
    g.set(9, 24, apron, 'apron');
    g.set(14, 24, apron, 'apron');
    g.rect(9, 25, 14, 31, apron, 'apron');
    g.rect(10, 28, 13, 29, mix(apron, INK, 0.2), 'apron');
    g.row(31, 9, 14, mix(apron, INK, 0.14), 'apron');
  }
  if (apron && back) {
    // from behind: the neck strap, the ties round the waist and their bow
    g.set(9, 24, apron, 'apron');
    g.set(14, 24, apron, 'apron');
    g.row(28, 7, 16, apron, 'apron');
    g.rect(10, 27, 13, 29, apron, 'apron');
    g.rect(11, 28, 12, 28, mix(apron, INK, 0.25), 'apron');
    g.rect(11, 30, 12, 31, apron, 'apron');
  }
  g.row(31, 7, 16, bottoms, 'cloth');
  g.row(32, 7, 16, mix(bottoms, INK, 0.18), 'cloth');
  if (apron && !back) g.rect(9, 31, 14, 31, mix(apron, INK, 0.14), 'apron');
  const legs = step ? [[9, 33, 33], [13, 33, 34]] : [[9, 33, 34], [13, 33, 34]];
  for (const [x, y0, y1] of legs) {
    g.rect(x, y0, x + 1, y0, skin, 'leg');
    g.rect(x, y0 + 1, x + 1, y1, '#ffffff', 'leg');
    g.rect(x - 1, y1 + 1, x + 1, y1 + 1, '#4a3b52', 'shoe');
  }

  if (back) {
    // 3b. from behind the whole head is hair, and long hair falls over the back
    g.ellipse(CX, 15.5, 7.7, 6.9, skinShade, 'skin');
    g.ellipse(CX, style.cy, style.rx, style.ry, hair, 'hair');
    for (let x = 4; x <= 19; x++) for (let y = 12; y <= 20; y++) if (g.get(x, y)?.r === 'skin') g.set(x, y, hair, 'hair');
    style.back?.(g, hair);
    style.extra?.(g, hair);
    accessory(g, look.accessory, true);
    // a few strands so it reads as hair, not a helmet
    const strand = mix(hair, INK, 0.16);
    for (const x of [7, 11, 16]) for (let y = 11; y <= 17; y++) if (g.get(x, y)?.c === hair) g.set(x, y, strand, 'hair');
  } else {
    // 3. the face
    g.ellipse(CX, 15.5, 7.7, 6.9, skin, 'skin');
    g.set(3, 16, skin, 'skin');
    g.set(20, 16, skin, 'skin');
    // Big anime eyes: a dark lash line, a white shine, and an iris that gets lighter toward the bottom.
    for (const x0 of [7, 14]) {
      g.row(16, x0, x0 + 2, INK, 'eye');
      g.set(x0, 17, '#ffffff', 'eye');
      g.set(x0 + 1, 17, mix(eye, INK, 0.3), 'eye');
      g.set(x0 + 2, 17, mix(eye, INK, 0.3), 'eye');
      g.set(x0, 18, eye, 'eye');
      g.set(x0 + 1, 18, eye, 'eye');
      g.set(x0 + 2, 18, mix(eye, '#ffffff', 0.25), 'eye');
      g.row(19, x0, x0 + 2, mix(eye, '#ffffff', 0.5), 'eye');
    }
    for (const x of [5, 6, 17, 18]) g.set(x, 20, mix(skin, '#f26d7d', 0.45), 'skin');
    g.row(21, 11, 12, '#b5564d', 'skin');

    // 4. hair over the forehead, with the shadow it casts on the face
    for (let x = 4; x <= 19; x++) {
      const depth = style.fringe[x - 4];
      for (let y = 6; y <= depth; y++) g.set(x, y, hair, 'hair');
      if (g.get(x, depth + 1)?.r === 'skin') g.set(x, depth + 1, mix(skin, skinShade, 0.55), 'skin');
    }
    style.extra?.(g, hair);
    accessory(g, look.accessory);
  }

  // 5. hair shading: a shine ring across the crown, darker toward the tips
  const shine = mix(hair, '#ffffff', 0.42);
  const dark = mix(hair, INK, 0.28);
  for (let y = 0; y < CHIBI_H; y++)
    for (let x = 0; x < CHIBI_W; x++) {
      const p = g.get(x, y);
      if (!p || p.r !== 'hair' || p.c !== hair) continue;
      const d = ((x - CX) / style.rx) ** 2 + ((y - style.cy) / style.ry) ** 2;
      if (y >= 6 && y <= 9 && d > 0.3 && d < 0.5 && Math.abs(x - CX) < 7 && x % 5 !== 2) g.set(x, y, shine, 'hair');
      else if ((y >= 18 && x >= 3 && x <= 20) || d > 0.86) g.set(x, y, dark, 'hair');
    }

  // 6. lines between parts, then the outline all round
  const line: Record<string, string[]> = { hair: ['skin', 'cloth', 'apron'], cloth: ['skin', 'leg'], apron: ['cloth'], acc: ['hair', 'skin'] };
  const out = new Grid();
  for (let y = 0; y < CHIBI_H; y++)
    for (let x = 0; x < CHIBI_W; x++) {
      const p = g.get(x, y);
      if (!p) continue;
      const near = [g.get(x - 1, y), g.get(x + 1, y), g.get(x, y - 1), g.get(x, y + 1)];
      const edge = x === 0 || y === 0 || x === CHIBI_W - 1 || y === CHIBI_H - 1 || near.some((n) => !n);
      let c = p.c;
      if (edge && p.r !== 'eye') c = p.r === 'skin' ? mix(p.c, '#8a4b3a', 0.5) : mix(p.c, INK, 0.68);
      else if (near.some((n) => n && n.r !== p.r && line[p.r]?.includes(n.r)) && p.c !== '#ffffff') c = mix(p.c, INK, 0.42);
      out.set(x, y, c, p.r);
    }
  return out;
}

/** Paint the sheet: stand and step side by side, facing front on the top row and away on the bottom row. */
export function paintChibi(ctx: CanvasRenderingContext2D, look: Look) {
  for (const [row, back] of [false, true].entries())
    for (const [i, step] of [false, true].entries()) {
      const g = drawPerson(look, step, back);
      for (let y = 0; y < CHIBI_H; y++)
        for (let x = 0; x < CHIBI_W; x++) {
          const p = g.get(x, y);
          if (!p) continue;
          ctx.fillStyle = p.c;
          ctx.fillRect(i * CHIBI_W + x, row * CHIBI_H + y, 1, 1);
        }
    }
}
