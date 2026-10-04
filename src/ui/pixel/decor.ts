import { PAL } from './palette';

/** Pixel drawings for the shop's dressing: tiles, wall garlands and the star-shop floor pieces. */

const WOOD_DEEP = '#7a5434';
const LEAF = '#6f9e58';
const LEAF_DARK = '#4f7d46';
const POT = '#c98a5a';

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, line: string = PAL.ink) {
  rect(ctx, x, y, w, h, line);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

/** One gạch bông cement tile: cream, with a blue-and-terracotta cross in the middle. */
export function cementTile(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alt: number) {
  rect(ctx, x, y, size, size, alt ? '#e9f0f8' : '#f7f0dc');
  const c = alt ? '#d97a62' : '#4f6680';
  const m = Math.floor(size / 2);
  rect(ctx, x + m - 1, y + 1, 2, size - 2, c);
  rect(ctx, x + 1, y + m - 1, size - 2, 2, c);
  rect(ctx, x + m - 1, y + m - 1, 2, 2, alt ? '#4f6680' : '#e0b072');
  rect(ctx, x, y, size, 1, 'rgba(62,74,54,0.18)');
  rect(ctx, x, y, 1, size, 'rgba(62,74,54,0.18)');
}

/** What's strung along the top of the back wall, between x = 8 and x = width - 8. */
export function drawGarland(ctx: CanvasRenderingContext2D, kind: string, width: number) {
  const sagAt = (i: number, every: number) => Math.round(1.5 * Math.sin((i / every) * Math.PI) ** 2);
  if (kind === 'silkLanterns' || kind === 'starLanterns') {
    const star = kind === 'starLanterns';
    const colours = star ? ['#e3b23c', '#d0634f', '#f4dc8c', '#d0634f'] : ['#d0634f', '#f4dc8c', '#8fb0bd', '#efb6a0', '#9dbf78'];
    for (let x = 8, i = 0; x < width - 12; x += 11, i++) {
      const sag = sagAt(i, 3);
      rect(ctx, x, 6 + sag, 11, 1, WOOD_DEEP);
      const c = colours[i % colours.length];
      const lx = x + 4;
      if (star) {
        // đèn ông sao: a little five-pointed star lantern
        rect(ctx, lx + 1, 7 + sag, 1, 1, c);
        rect(ctx, lx - 1, 8 + sag, 5, 1, c);
        rect(ctx, lx, 9 + sag, 3, 1, c);
        rect(ctx, lx - 1, 10 + sag, 2, 1, c);
        rect(ctx, lx + 2, 10 + sag, 2, 1, c);
        rect(ctx, lx + 1, 11 + sag, 1, 2, '#f4dc8c');
      } else {
        rect(ctx, lx + 1, 7 + sag, 2, 1, PAL.ink);
        rect(ctx, lx, 8 + sag, 4, 4, c);
        rect(ctx, lx + 1, 8 + sag, 1, 4, 'rgba(255,255,255,0.35)');
        rect(ctx, lx + 1, 12 + sag, 2, 1, PAL.ink);
        rect(ctx, lx + 1, 13 + sag, 1, 2, '#e3b23c');
      }
    }
  } else if (kind === 'flowerGarland') {
    const blooms = ['#efb6a0', '#ffffff', '#f4dc8c', '#c9b3ea', '#d97a62'];
    for (let x = 7, i = 0; x < width - 7; x++, i++) {
      const y = 7 + Math.round(1.5 * Math.sin(i / 5));
      rect(ctx, x, y, 1, 1, LEAF_DARK);
      if (i % 3 === 0) rect(ctx, x, y + 1, 1, 1, LEAF);
      if (i % 9 === 4) {
        rect(ctx, x - 1, y - 1, 3, 3, blooms[Math.floor(i / 9) % blooms.length]);
        rect(ctx, x, y, 1, 1, '#f4dc8c');
      }
    }
  } else if (kind === 'tetBanner') {
    // red cloth with gold edges and gold diamonds, and tassels hanging below
    rect(ctx, 7, 5, width - 14, 5, '#b8433a');
    rect(ctx, 7, 5, width - 14, 1, '#e3b23c');
    rect(ctx, 7, 9, width - 14, 1, '#e3b23c');
    for (let x = 12; x < width - 12; x += 10) {
      rect(ctx, x + 1, 6, 1, 3, '#f4dc8c');
      rect(ctx, x, 7, 3, 1, '#f4dc8c');
    }
    for (let x = 16; x < width - 12; x += 20) {
      rect(ctx, x, 10, 1, 3, '#e3b23c');
      rect(ctx, x - 1, 13, 3, 1, '#b8433a');
    }
  } else if (kind === 'neonStrip') {
    // pink and blue neon tubes with a soft glow
    for (let x = 8; x < width - 8; x++) {
      const pink = Math.floor((x - 8) / 28) % 2 === 0;
      const glow = pink ? 'rgba(239,128,176,0.35)' : 'rgba(120,200,230,0.35)';
      rect(ctx, x, 6, 1, 1, glow);
      rect(ctx, x, 7, 1, 1, pink ? '#f48fbf' : '#8fd8f0');
      rect(ctx, x, 8, 1, 1, glow);
    }
  } else {
    const flags = ['#efb6a0', '#eee3a8', '#9dbf78', '#b8cfd6', '#d97a62'];
    for (let x = 8, i = 0; x < width - 12; x += 7, i++) {
      const sag = sagAt(i, 4);
      rect(ctx, x, 6 + sag, 7, 1, WOOD_DEEP);
      rect(ctx, x + 1, 7 + sag, 5, 1, flags[i % flags.length]);
      rect(ctx, x + 2, 8 + sag, 3, 1, flags[i % flags.length]);
      rect(ctx, x + 3, 9 + sag, 1, 1, flags[i % flags.length]);
    }
  }
}

/** Star-shop floor pieces, each drawn at (0, 0) in its own little canvas (sizes in data/shopfit.ts). */
export const DRAW_DECO: Record<string, (ctx: CanvasRenderingContext2D) => void> = {
  lanternStand: (ctx) => {
    rect(ctx, 4, 8, 2, 12, WOOD_DEEP);
    rect(ctx, 2, 20, 6, 2, WOOD_DEEP);
    rect(ctx, 3, 0, 4, 1, PAL.ink);
    rect(ctx, 1, 1, 8, 7, '#d0634f');
    rect(ctx, 0, 2, 10, 5, '#d0634f');
    rect(ctx, 3, 1, 1, 7, 'rgba(255,255,255,0.3)');
    rect(ctx, 1, 8, 8, 1, '#e3b23c');
    rect(ctx, 4, 9, 2, 2, '#f4dc8c');
  },
  ceramicVases: (ctx) => {
    for (const [x, w, h] of [
      [0, 7, 13],
      [8, 7, 10],
    ]) {
      const y = 14 - h;
      rect(ctx, x + 1, y, w - 2, 1, '#4f6680');
      rect(ctx, x, y + 1, w, h - 1, '#eef2f7');
      rect(ctx, x, y + 1, 1, h - 1, PAL.ink);
      rect(ctx, x + w - 1, y + 1, 1, h - 1, PAL.ink);
      rect(ctx, x, y + h - 1, w, 1, PAL.ink);
      for (let j = y + 3; j < y + h - 2; j += 3) rect(ctx, x + 2, j, w - 4, 1, '#4f6680');
    }
  },
  flowerCart: (ctx) => {
    box(ctx, 2, 8, 12, 8, '#8fb0bd');
    rect(ctx, 3, 10, 10, 1, '#cfe0e8');
    const blooms = ['#efb6a0', '#ffffff', '#f4dc8c', '#c9b3ea', '#d97a62', '#efb6a0'];
    for (let i = 0; i < 6; i++) {
      rect(ctx, 3 + i * 2, 3 + (i % 2), 1, 5, LEAF_DARK);
      rect(ctx, 2 + i * 2, 1 + (i % 2) * 2, 3, 3, blooms[i]);
    }
  },
  hydrangea: (ctx) => {
    box(ctx, 2, 10, 8, 6, POT, WOOD_DEEP);
    rect(ctx, 1, 7, 10, 4, LEAF_DARK);
    for (const [x, y, c] of [
      [2, 2, '#b9a6d8'],
      [6, 1, '#8fb0bd'],
      [4, 5, '#c9b3ea'],
      [8, 4, '#b9a6d8'],
      [0, 5, '#8fb0bd'],
    ] as const) {
      rect(ctx, x, y, 4, 4, c);
      rect(ctx, x + 1, y + 1, 1, 1, '#ffffff');
    }
  },
  kumquatTree: (ctx) => {
    box(ctx, 3, 16, 8, 6, '#b8433a');
    rect(ctx, 4, 17, 6, 1, '#e3b23c');
    rect(ctx, 6, 10, 2, 6, WOOD_DEEP);
    ctx.fillStyle = LEAF_DARK;
    ctx.beginPath();
    ctx.arc(7, 7, 7, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y] of [
      [3, 4],
      [8, 3],
      [10, 7],
      [5, 9],
      [2, 7],
      [7, 6],
    ])
      rect(ctx, x, y, 2, 2, '#f0a43a');
    rect(ctx, 9, 10, 2, 3, '#d0634f');
  },
  peachBlossom: (ctx) => {
    box(ctx, 3, 18, 8, 6, '#e9f0f8', '#4f6680');
    rect(ctx, 4, 20, 6, 1, '#4f6680');
    rect(ctx, 6, 6, 1, 12, WOOD_DEEP);
    rect(ctx, 3, 3, 1, 7, WOOD_DEEP);
    rect(ctx, 4, 9, 2, 1, WOOD_DEEP);
    rect(ctx, 9, 1, 1, 9, WOOD_DEEP);
    rect(ctx, 7, 9, 2, 1, WOOD_DEEP);
    for (const [x, y] of [
      [2, 1],
      [4, 4],
      [8, 0],
      [10, 3],
      [1, 6],
      [11, 7],
      [6, 3],
      [5, 7],
    ]) {
      rect(ctx, x, y, 2, 2, '#f5b8c8');
      rect(ctx, x, y, 1, 1, '#ffffff');
    }
  },
  coffeeSacks: (ctx) => {
    for (const [x, y] of [
      [0, 3],
      [8, 2],
    ]) {
      box(ctx, x, y + 2, 10, 8, '#c9a46e', WOOD_DEEP);
      rect(ctx, x + 2, y, 6, 3, '#c9a46e');
      rect(ctx, x + 3, y + 5, 4, 2, WOOD_DEEP);
    }
    for (const x of [3, 6, 11, 14]) rect(ctx, x, 1, 1, 1, '#5a3a2a');
  },
  stoolStack: (ctx) => {
    for (let i = 0; i < 4; i++) {
      const y = 1 + i * 3;
      rect(ctx, 0, y, 10, 2, i % 2 ? '#d0634f' : '#4f6680');
      rect(ctx, 0, y + 2, 10, 1, 'rgba(0,0,0,0.2)');
    }
    rect(ctx, 1, 13, 2, 5, '#4f6680');
    rect(ctx, 7, 13, 2, 5, '#4f6680');
  },
  fishTank: (ctx) => {
    rect(ctx, 2, 12, 2, 6, WOOD_DEEP);
    rect(ctx, 14, 12, 2, 6, WOOD_DEEP);
    rect(ctx, 0, 11, 18, 2, '#b98352');
    box(ctx, 0, 0, 18, 11, '#b8dce6');
    rect(ctx, 1, 1, 16, 2, '#dff0f4');
    rect(ctx, 1, 8, 16, 2, '#e2d6b4');
    rect(ctx, 2, 5, 4, 2, '#f0a43a');
    rect(ctx, 11, 3, 4, 2, '#d0634f');
    rect(ctx, 8, 5, 1, 4, LEAF);
    rect(ctx, 10, 6, 1, 3, LEAF_DARK);
  },
};
