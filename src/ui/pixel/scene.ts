import type { DecorId, ShopStyle, UpgradeId, Weather } from '../../engine/types';
import { PAL } from './palette';

/**
 * The shop, seen from above at an angle (like a cozy RPG room): a back wall with the window,
 * bread shelves, menu board and oven; a service counter with the glass case across the middle;
 * the queue in front of the register; gingham tables and the cat mat by the door at the bottom.
 */
export const STAGE_W = 240;
export const STAGE_H = 168;

/** Fixed layout of the room, in stage pixels. People are placed by their feet. */
export const LAYOUT = {
  floorY: 42,
  bottomY: 162,
  /** The way in: a gap in the bottom wall. */
  door: { x: 14, w: 30 },
  window: { x: 8, y: 8, w: 46, h: 30 },
  bookcase: { x: 58, y: 8, w: 26, h: 48 },
  board: { x: 96, y: 8, w: 48, h: 28 },
  backCounter: { x: 92, y: 43, w: 82 },
  coffee: { x: 150, y: 43 },
  fridge: { x: 175, y: 14, w: 15, h: 43 },
  oven: { x: 193, y: 10, w: 39, h: 47 },
  /** Service counter: a top face 10 deep, then a front 20 tall. */
  counter: { x: 56, y: 66, w: 136 },
  case: { x: 58, y: 75, w: 72, h: 21 },
  register: { x: 148, y: 57, w: 14, h: 12 },
  player: { x: 168, feet: 74 },
  /** Staff stand here, behind the counter. */
  staffFeet: 74,
  queueY: 122,
  queueX: [138, 162, 186, 210],
  /** Just inside the door, and the row people walk along below the queue. */
  entry: { x: 21, y: 131 },
  tables: [72, 130],
  cornerTable: 190,
  tableY: 136,
  seatY: 157,
};

/** Left edge of each pendant lamp's shade; its glow centres on lx + 4. */
export const LAMPS_X = [84, 178];
export const LAMP_GLOW_Y = 11;

export type Light = 0 | 1 | 2 | 3 | 4;

export interface SceneOpts {
  weather: Weather;
  light: Light;
  decor: DecorId[];
  upgrades: UpgradeId[];
  tet: boolean;
  competitor: boolean;
  style?: ShopStyle;
  /** The Lantern Festival prize, on the back counter. */
  prize?: 'won' | 'second';
}

/** Paint and floor choices. Index 0 of each list is how the shop starts. */
export const WALLS = [
  { name: 'Cream', c: '#f7efd8', accent: '#efe3c4' },
  { name: 'Sage', c: '#e3ebcf', accent: '#d2dfb4' },
  { name: 'Peach', c: '#f9e3d3', accent: '#f0c4a4' },
  { name: 'Sky', c: '#e1e8f5', accent: '#c5d0ea' },
  { name: 'Butter', c: '#f3f1cb', accent: '#eee3a8' },
  { name: 'Rose', c: '#f8e1e8', accent: '#f4b9cb' },
  { name: 'Lavender', c: '#ece4f5', accent: '#d6c8ea' },
  { name: 'Mint', c: '#e2f3e8', accent: '#c3e4cf' },
  { name: 'Lemon', c: '#fbf3c8', accent: '#f4e39a' },
  { name: 'Dusk', c: '#e4e2f0', accent: '#c9c4e0' },
];
export const PATTERNS = ['Stripes', 'Plain', 'Dots', 'Checks'];
export const FLOORS = [
  { name: 'Cream tiles', a: '#f6ecd2', b: '#f0e3c0', line: '#e3d3a8', tiles: true },
  { name: 'Wood', a: '#dcae74', b: '#dcae74', line: '#b98352', tiles: false },
  { name: 'Terracotta', a: '#e0a57c', b: '#d69870', line: '#b9795a', tiles: true },
  { name: 'Dark wood', a: '#b98363', b: '#b98363', line: '#8f6249', tiles: false },
  { name: 'Pink tiles', a: '#f8e6ea', b: '#f1cfd8', line: '#e4b6c2', tiles: true },
  { name: 'Blue tiles', a: '#e9f0f8', b: '#d3e0f0', line: '#b6c7de', tiles: true },
  { name: 'Green tiles', a: '#e8f0d8', b: '#d3e2b8', line: '#b8cb98', tiles: true },
  { name: 'Honey wood', a: '#e8c48e', b: '#e8c48e', line: '#c49a62', tiles: false },
];
export const COUNTERS = [
  { name: 'Wood and green', body: '#d9b07a', top: '#4f7d46' },
  { name: 'Pink', body: '#f8e1e8', top: '#d97a62' },
  { name: 'Blue', body: '#e1e8f5', top: '#8fb0bd' },
  { name: 'Wood', body: '#e0b072', top: '#a87545' },
  { name: 'Gold', body: '#f3e2b0', top: '#e3b23c' },
  { name: 'Mint', body: '#e2f3e8', top: '#4f9d7a' },
  { name: 'Marble', body: '#f3f2ee', top: '#9aa0a6' },
  { name: 'Lavender', body: '#ece4f5', top: '#8a6fb8' },
];
/** Where movable decorations can go (stage px, top-left of the sprite). */
export const FLOOR_SPOTS = [
  { x: 8, y: 58 },
  { x: 46, y: 146 },
  { x: 8, y: 92 },
];
export const CAGE_SPOTS = [
  { x: 8, y: 44 },
  { x: 222, y: 60 },
  { x: 8, y: 78 },
];
const at = <T,>(list: T[], i: number | undefined): T => list[(i ?? 0) % list.length] ?? list[0];

/** Where diners sit: the chairs either side of each table (cell-left x, feet y). */
export function seats(corner: boolean): { x: number; y: number }[] {
  const tables = corner ? [...LAYOUT.tables, LAYOUT.cornerTable] : LAYOUT.tables;
  return tables.flatMap((tx) => [
    { x: tx - 15, y: LAYOUT.seatY },
    { x: tx + 25, y: LAYOUT.seatY },
  ]);
}

/** Sky through the window by weather, for dawn, morning, midday, golden hour and night. */
const SKY: Record<Weather, string[]> = {
  sunny: ['#fbe5c0', '#d6e9e3', '#cfe6e4', '#f3c98a', '#3e4a36'],
  cloudy: ['#f1e3c8', '#dbe4dc', '#d5dfd8', '#e8c99a', '#3e4a36'],
  rainy: ['#b8cfd6', '#aab9b0', '#aab9b0', '#8c9a88', '#3e4a36'],
  hot: ['#fbe2a8', '#f6e7b8', '#f4e2a4', '#f0b874', '#3e4a36'],
  cool: ['#f2ead8', '#d9e8e6', '#d3e5e6', '#ebcb98', '#3e4a36'],
};

const C = {
  wallCap: '#4f7d46',
  wallCapHi: '#6f9e58',
  wallEdge: '#3e5f38',
  base: '#c4d3a2',
  baseLine: '#a3b97f',
  frame: '#4f7d46',
  wood: '#b98352',
  woodLight: '#d9b07a',
  woodPale: '#e8c897',
  woodDark: '#a87545',
  woodDeep: '#7a5434',
  leaf: '#6f9e58',
  leafDark: '#4f7d46',
  pot: '#c98a5a',
  lamp: '#f4dc8c',
  cream: '#f7f0dc',
  chalk: '#3f5a3a',
};

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, line: string = PAL.ink) {
  rect(ctx, x, y, w, h, line);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

// ---------------------------------------------------------------- small props

/** A loaf, a baguette or a round bun on a shelf, sitting on `y`. */
function loaf(ctx: CanvasRenderingContext2D, x: number, y: number, kind: number) {
  const crust = ['#c98a4a', '#d9a05a', '#b8763c'][kind % 3];
  const top = ['#e7b56d', '#efc27a', '#d79552'][kind % 3];
  if (kind % 3 === 1) {
    rect(ctx, x, y - 2, 9, 2, crust);
    rect(ctx, x + 1, y - 3, 7, 1, top);
    for (const sx of [2, 5]) rect(ctx, x + sx, y - 3, 1, 1, '#f7e2b5');
  } else {
    rect(ctx, x, y - 3, 6, 3, crust);
    rect(ctx, x + 1, y - 5, 4, 2, top);
    rect(ctx, x + 2, y - 5, 1, 1, '#f7e2b5');
  }
}

/** The shop cat, asleep on a green cushion. (x, y) is the cushion's top-left. */
function shopCat(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x, y + 8, 22, 4, C.leafDark);
  rect(ctx, x + 1, y + 7, 20, 2, C.leaf);
  const fur = '#f0b56e';
  rect(ctx, x + 4, y + 1, 14, 6, fur);
  rect(ctx, x + 5, y, 12, 1, fur);
  rect(ctx, x + 4, y + 3, 4, 4, '#ffffff');
  for (const sx of [9, 13]) rect(ctx, x + sx, y + 1, 2, 1, '#d48d48');
  rect(ctx, x + 2, y + 2, 5, 4, fur);
  rect(ctx, x + 2, y + 1, 1, 1, fur);
  rect(ctx, x + 6, y + 1, 1, 1, fur);
  rect(ctx, x + 3, y + 4, 1, 1, PAL.ink);
  rect(ctx, x + 5, y + 4, 1, 1, PAL.ink);
  rect(ctx, x + 16, y + 5, 5, 2, fur);
  rect(ctx, x + 20, y + 4, 1, 1, '#d48d48');
}

/** The green doormat with a cat's face on it. */
function catMat(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, x + 1, y, 29, 17, '#7fa36a');
  rect(ctx, x, y + 1, 31, 15, '#7fa36a');
  const edge = '#a9c78c';
  rect(ctx, x + 2, y + 1, 27, 1, edge);
  rect(ctx, x + 2, y + 15, 27, 1, edge);
  rect(ctx, x + 1, y + 2, 1, 13, edge);
  rect(ctx, x + 29, y + 2, 1, 13, edge);
  const c = '#eef5de';
  // ears
  for (const [ex, ey, w] of [[9, 3, 2], [9, 4, 3], [20, 3, 2], [19, 4, 3]]) rect(ctx, x + ex, y + ey, w, 1, c);
  // head
  rect(ctx, x + 11, y + 5, 9, 1, c);
  rect(ctx, x + 9, y + 5, 1, 7, c);
  rect(ctx, x + 21, y + 5, 1, 7, c);
  rect(ctx, x + 10, y + 12, 11, 1, c);
  // eyes, nose, mouth, whiskers
  rect(ctx, x + 12, y + 7, 1, 2, c);
  rect(ctx, x + 18, y + 7, 1, 2, c);
  rect(ctx, x + 15, y + 9, 1, 1, c);
  rect(ctx, x + 14, y + 10, 1, 1, c);
  rect(ctx, x + 16, y + 10, 1, 1, c);
  for (const wy of [8, 10]) {
    rect(ctx, x + 5, y + wy, 3, 1, c);
    rect(ctx, x + 23, y + wy, 3, 1, c);
  }
}

/** Green gingham: cream cloth with pale bands that go darker where they cross. */
function gingham(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  rect(ctx, x, y, w, h, '#f7efd8');
  for (let i = 0; i < w; i += 4) rect(ctx, x + i, y, 2, h, '#cfe0b4');
  for (let j = 0; j < h; j += 4) {
    rect(ctx, x, y + j, w, 2, '#cfe0b4');
    for (let i = 0; i < w; i += 4) rect(ctx, x + i, y + j, 2, 2, '#9dbf78');
  }
}

/** A wooden chair seen from the front: slatted back, seat, legs. */
function chair(ctx: CanvasRenderingContext2D, cx: number, y: number) {
  rect(ctx, cx, y, 10, 8, C.wood);
  rect(ctx, cx, y, 10, 1, C.woodLight);
  rect(ctx, cx + 3, y + 2, 1, 5, C.woodDeep);
  rect(ctx, cx + 6, y + 2, 1, 5, C.woodDeep);
  rect(ctx, cx, y + 8, 10, 4, C.woodLight);
  rect(ctx, cx, y + 12, 10, 1, C.woodDeep);
  rect(ctx, cx, y + 13, 1, 5, C.woodDeep);
  rect(ctx, cx + 9, y + 13, 1, 5, C.woodDeep);
}

/** A table for two under a gingham cloth, with a chair either side. `tx` is the table's left edge. */
function cafeTable(ctx: CanvasRenderingContext2D, tx: number) {
  const ty = LAYOUT.tableY;
  chair(ctx, tx - 12, ty + 2);
  chair(ctx, tx + 28, ty + 2);
  gingham(ctx, tx - 1, ty, 28, 12);
  // the cloth hangs over the front edge, a little in shadow
  gingham(ctx, tx - 1, ty + 12, 28, 6);
  rect(ctx, tx - 1, ty + 12, 28, 6, 'rgba(62,74,54,0.14)');
  rect(ctx, tx - 1, ty + 12, 28, 1, 'rgba(62,74,54,0.18)');
  rect(ctx, tx - 1, ty + 18, 28, 1, C.leaf);
  rect(ctx, tx + 2, ty + 19, 2, 3, C.woodDeep);
  rect(ctx, tx + 22, ty + 19, 2, 3, C.woodDeep);
  // a vase of flowers, a plate and a cup
  rect(ctx, tx + 11, ty - 2, 4, 5, '#ffffff');
  rect(ctx, tx + 11, ty + 2, 4, 1, '#b8cfd6');
  rect(ctx, tx + 10, ty - 5, 2, 3, C.leaf);
  rect(ctx, tx + 14, ty - 6, 2, 4, C.leafDark);
  rect(ctx, tx + 12, ty - 7, 2, 2, '#f4dc8c');
  rect(ctx, tx + 9, ty - 6, 2, 2, '#efb6a0');
  rect(ctx, tx + 3, ty + 5, 6, 3, '#ffffff');
  rect(ctx, tx + 4, ty + 5, 4, 2, '#e7b56d');
  rect(ctx, tx + 19, ty + 5, 4, 3, '#ffffff');
  rect(ctx, tx + 20, ty + 5, 2, 1, '#8a5f3a');
}

// ---------------------------------------------------------------- the street outside

export function drawStreet(ctx: CanvasRenderingContext2D, o: SceneOpts) {
  const { x, y, w, h } = LAYOUT.window;
  const ix = x + 2;
  const iy = y + 2;
  const iw = w - 4;
  const ih = h - 4;
  const night = o.light === 4;
  // Nothing outside may paint over the window frame.
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, iw, ih);
  ctx.clip();
  rect(ctx, ix, iy, iw, ih, SKY[o.weather][o.light]);
  if (night) for (const [sx, sy] of [[5, 2], [17, 4], [30, 1], [38, 5]]) rect(ctx, ix + sx, iy + sy, 1, 1, C.cream);
  ctx.fillStyle = 'rgba(59,42,37,0.5)';
  for (let i = 0; i < iw; i++) ctx.fillRect(ix + i, iy + 2 + Math.round(2 * Math.sin((i / iw) * Math.PI)), 1, 1);
  // the shop across the street: flowers, or the rival bánh mì stand later in the year
  const bx = ix + 2;
  const by = iy + 5;
  rect(ctx, bx, by, 20, 12, night ? '#3e4a36' : '#e3ebcf');
  rect(ctx, bx, by, 20, 1, PAL.ink);
  for (let i = 0; i < 2; i++) box(ctx, bx + 2 + i * 9, by + 2, 7, 4, o.light >= 3 ? '#eee3a8' : '#cfe6e4');
  const awn = o.competitor ? ['#a87545', C.cream] : ['#4f7d46', C.cream];
  for (let i = 0; i < 20; i++) rect(ctx, bx + i, by + 7, 1, 2, awn[Math.floor(i / 2) % 2]);
  rect(ctx, bx, by + 9, 20, 3, night ? '#3e4a36' : C.cream);
  rect(ctx, bx + 3, by + 9, 4, 3, '#3e4a36');
  if (o.competitor) rect(ctx, bx + 10, by + 9, 8, 3, '#e0b072');
  else for (let i = 0; i < 3; i++) rect(ctx, bx + 10 + i * 3, by + 10, 2, 2, ['#d97a62', '#f4dc8c', '#efb6a0'][i]);
  // a second building and a tree
  rect(ctx, ix + 31, iy + 3, 10, 14, night ? '#3e4a36' : C.cream);
  rect(ctx, ix + 31, iy + 3, 10, 1, PAL.ink);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) rect(ctx, ix + 33 + c * 4, iy + 5 + r * 4, 3, 3, o.light >= 3 ? '#eee3a8' : '#cfe6e4');
  rect(ctx, ix + 25, iy + 10, 2, 7, C.woodDeep);
  ctx.fillStyle = night ? '#3e4a36' : C.leaf;
  for (const [tx, ty, r] of [[26, 8, 4], [23, 10, 3], [29, 10, 3]]) {
    ctx.beginPath();
    ctx.arc(ix + tx, iy + ty, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // pavement and road
  rect(ctx, ix, iy + 17, iw, 2, '#e2d6b4');
  rect(ctx, ix, iy + 19, iw, ih - 19, night ? '#3e4a36' : '#6b7560');
  for (let i = 1; i < iw; i += 8) rect(ctx, ix + i, iy + 22, 4, 1, '#f2e2bd');
  if (o.decor.includes('bike')) {
    box(ctx, ix + 31, iy + 14, 4, 4, C.cream);
    box(ctx, ix + 37, iy + 14, 4, 4, C.cream);
    rect(ctx, ix + 33, iy + 14, 6, 1, PAL.ink);
    rect(ctx, ix + 34, iy + 12, 3, 2, '#d97a62');
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the room

/** Floor, walls and everything that stands against the back wall. Drawn first, behind everyone. */
export function drawRoom(ctx: CanvasRenderingContext2D, o: SceneOpts) {
  const L = LAYOUT;
  const has = (u: UpgradeId) => o.upgrades.includes(u);
  const owns = (d: DecorId) => o.decor.includes(d);

  // floor
  const floor = at(FLOORS, o.style?.floor);
  rect(ctx, 0, L.floorY, STAGE_W, STAGE_H - L.floorY, floor.a);
  if (floor.tiles) {
    for (let y = L.floorY, r = 0; y < STAGE_H; y += 12, r++) for (let x = 6 + (r % 2 ? 16 : 0); x < STAGE_W; x += 32) rect(ctx, x, y, 16, 12, floor.b);
    for (let y = L.floorY; y < STAGE_H; y += 12) rect(ctx, 0, y, STAGE_W, 1, floor.line);
    for (let x = 6; x < STAGE_W; x += 16) rect(ctx, x, L.floorY, 1, STAGE_H - L.floorY, floor.line);
  } else
    for (let y = L.floorY, r = 0; y < STAGE_H; y += 8, r++) {
      rect(ctx, 0, y, STAGE_W, 1, floor.line);
      for (let x = 6 + (r % 2 ? 14 : 0); x < STAGE_W; x += 28) rect(ctx, x, y + 1, 1, 7, floor.line);
    }
  // the open doorway, the cat mat inside it, and the runner where people queue
  rect(ctx, L.door.x, L.bottomY, L.door.w, STAGE_H - L.bottomY, '#dcae74');
  for (let x = L.door.x + 6; x < L.door.x + L.door.w; x += 8) rect(ctx, x, L.bottomY, 1, STAGE_H - L.bottomY, '#b98352');
  catMat(ctx, L.door.x - 1, 143);
  if (owns('rug')) {
    rect(ctx, 134, 108, 96, 16, '#e7c58d');
    for (let x = 137; x < 228; x += 6) rect(ctx, x, 111, 3, 10, '#c98a5a');
    rect(ctx, 134, 108, 96, 1, C.woodDark);
    rect(ctx, 134, 123, 96, 1, C.woodDark);
    for (let x = 134; x < 230; x += 3) {
      rect(ctx, x, 107, 1, 1, C.woodDark);
      rect(ctx, x, 124, 1, 1, C.woodDark);
    }
  }

  // back wall: paint, pattern, baseboard, and a soft shadow on the floor below it
  const wall = at(WALLS, o.style?.wall);
  const pattern = (o.style?.pattern ?? 0) % PATTERNS.length;
  rect(ctx, 0, 4, STAGE_W, 35, wall.c);
  if (pattern === 0) for (let x = 7; x < STAGE_W - 6; x += 6) rect(ctx, x, 4, 2, 35, wall.accent);
  if (pattern === 2) for (let y = 7, r = 0; y < 37; y += 6, r++) for (let x = 8 + (r % 2 ? 4 : 0); x < STAGE_W - 6; x += 8) rect(ctx, x, y, 2, 2, wall.accent);
  if (pattern === 3) for (let y = 4, r = 0; y < 39; y += 7, r++) for (let x = 6 + (r % 2) * 7; x < STAGE_W - 6; x += 14) rect(ctx, x, y, 7, Math.min(7, 39 - y), wall.accent);
  rect(ctx, 0, 39, STAGE_W, 3, C.base);
  rect(ctx, 0, 39, STAGE_W, 1, C.baseLine);
  rect(ctx, 0, L.floorY, STAGE_W, 2, 'rgba(62,74,54,0.10)');
  // the top of the wall, and the side walls running down the room
  rect(ctx, 0, 0, STAGE_W, 4, C.wallCap);
  rect(ctx, 0, 1, STAGE_W, 1, C.wallCapHi);
  rect(ctx, 0, 4, STAGE_W, 1, 'rgba(62,74,54,0.22)');
  for (const sx of [0, STAGE_W - 6]) rect(ctx, sx, 0, 6, STAGE_H, C.wallCap);
  rect(ctx, 1, 0, 1, STAGE_H, C.wallCapHi);
  rect(ctx, STAGE_W - 2, 0, 1, STAGE_H, C.wallCapHi);
  rect(ctx, 5, 4, 1, STAGE_H - 4, C.wallEdge);
  rect(ctx, STAGE_W - 6, 4, 1, STAGE_H - 4, C.wallEdge);
  if (has('loft')) {
    rect(ctx, 6, 0, STAGE_W - 12, 4, C.wood);
    for (let x = 8; x < STAGE_W - 8; x += 5) rect(ctx, x, 1, 1, 3, C.woodDeep);
  }

  // bunting strung along the top of the wall (the bookcase, board and oven hang in front of it)
  const flags = ['#efb6a0', '#eee3a8', '#9dbf78', '#b8cfd6', '#d97a62'];
  for (let x = 8, i = 0; x < STAGE_W - 12; x += 7, i++) {
    const sag = Math.round(1.5 * Math.sin((i / 4) * Math.PI) ** 2);
    rect(ctx, x, 6 + sag, 7, 1, C.woodDeep);
    rect(ctx, x + 1, 7 + sag, 5, 1, flags[i % flags.length]);
    rect(ctx, x + 2, 8 + sag, 3, 1, flags[i % flags.length]);
    rect(ctx, x + 3, 9 + sag, 1, 1, flags[i % flags.length]);
  }

  // window: the frame's backing and the street outside (the frame, sill and plants go on the front layer)
  const W = L.window;
  box(ctx, W.x, W.y, W.w, W.h, C.frame, C.wallEdge);
  drawStreet(ctx, o);

  // the bread bookcase
  const B = L.bookcase;
  rect(ctx, B.x, B.y - 2, B.w, 2, C.woodLight);
  rect(ctx, B.x, B.y, B.w, B.h, C.woodDeep);
  rect(ctx, B.x + 1, B.y + 1, B.w - 2, B.h - 2, '#946a45');
  [B.y + 11, B.y + 23, B.y + 35, B.y + B.h - 3].forEach((sy, i) => {
    rect(ctx, B.x + 1, sy, B.w - 2, 2, '#c9955f');
    if (i < 3) rect(ctx, B.x + 1, sy + 2, B.w - 2, 1, C.woodDeep);
    loaf(ctx, B.x + 3, sy, i);
    loaf(ctx, B.x + 14, sy, i + 1);
  });

  // the chalkboard menu (the words are drawn by the page, on top)
  const M = L.board;
  box(ctx, M.x - 2, M.y - 2, M.w + 4, M.h + 4, C.wood, C.woodDeep);
  rect(ctx, M.x, M.y, M.w, M.h, C.chalk);
  rect(ctx, M.x - 2, M.y + M.h + 2, M.w + 4, 1, C.woodDeep);

  // above the coffee corner: a shelf of plants, or the lacquer painting
  if (owns('art')) {
    box(ctx, 150, 9, 21, 17, '#e0b072', C.woodDeep);
    rect(ctx, 152, 11, 17, 13, '#3e4a36');
    rect(ctx, 153, 18, 15, 5, '#7a3b2e');
    ctx.fillStyle = '#f4dc8c';
    ctx.beginPath();
    ctx.arc(165, 15, 2, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, 156, 15, 1, 7, '#f4dc8c');
    rect(ctx, 155, 15, 4, 1, '#f4dc8c');
  } else {
    rect(ctx, 149, 23, 23, 2, C.wood);
    rect(ctx, 149, 25, 23, 1, C.woodDeep);
    rect(ctx, 151, 26, 1, 2, C.woodDeep);
    rect(ctx, 169, 26, 1, 2, C.woodDeep);
    // on the shelf: a teapot, a framed heart and a little cake under a glass dome
    rect(ctx, 151, 19, 6, 4, '#b8cfd6');
    rect(ctx, 152, 18, 4, 1, C.woodDeep);
    rect(ctx, 157, 20, 2, 1, '#b8cfd6');
    rect(ctx, 150, 20, 1, 2, C.woodDeep);
    box(ctx, 159, 15, 7, 8, C.cream, C.woodDeep);
    rect(ctx, 161, 17, 1, 2, '#d97a62');
    rect(ctx, 163, 17, 1, 2, '#d97a62');
    rect(ctx, 162, 18, 1, 2, '#d97a62');
    rect(ctx, 167, 22, 5, 1, C.woodDeep);
    rect(ctx, 168, 20, 3, 2, '#efb6a0');
    rect(ctx, 169, 19, 1, 1, '#d97a62');
    rect(ctx, 167, 18, 5, 1, 'rgba(255,255,255,0.7)');
    rect(ctx, 167, 18, 1, 4, 'rgba(255,255,255,0.5)');
    rect(ctx, 171, 18, 1, 4, 'rgba(255,255,255,0.5)');
  }

  // the back counter: jars, the radio, the festival prize, and the coffee corner
  const K = L.backCounter;
  rect(ctx, K.x, K.y, K.w, 6, C.woodPale);
  rect(ctx, K.x, K.y, K.w, 1, '#f3dcb3');
  rect(ctx, K.x, K.y + 6, K.w, 8, C.wood);
  rect(ctx, K.x, K.y + 6, K.w, 1, C.woodDark);
  for (let x = K.x + 2; x + 11 <= K.x + K.w; x += 13) {
    rect(ctx, x, K.y + 8, 11, 5, '#c9955f');
    rect(ctx, x + 5, K.y + 10, 1, 1, C.woodDeep);
  }
  rect(ctx, K.x, K.y + 13, K.w, 1, C.woodDeep);
  rect(ctx, K.x, K.y, 1, 14, C.woodDeep);
  rect(ctx, K.x + K.w - 1, K.y, 1, 14, C.woodDeep);
  ['#f4dc8c', '#efb6a0', '#9dbf78', '#8a5f3a', '#e0b072'].forEach((c, i) => {
    const jx = K.x + 3 + i * 9;
    box(ctx, jx, K.y - 4, 7, 7, C.cream);
    rect(ctx, jx + 1, K.y - 1, 5, 3, c);
    rect(ctx, jx, K.y - 5, 7, 2, C.wood);
  });
  if (owns('radio')) {
    box(ctx, K.x + 30, K.y - 6, 15, 9, '#d97a62');
    rect(ctx, K.x + 32, K.y - 4, 5, 5, PAL.ink);
    rect(ctx, K.x + 39, K.y - 4, 4, 2, C.cream);
    rect(ctx, K.x + 42, K.y - 9, 1, 3, PAL.ink);
  }
  if (o.prize) {
    const px = K.x + 47;
    rect(ctx, px + 1, K.y + 1, 7, 2, C.woodDark);
    if (o.prize === 'won') {
      // the Golden Whisk
      const gold = '#e3b23c';
      rect(ctx, px + 4, K.y - 10, 1, 5, gold);
      rect(ctx, px + 2, K.y - 5, 5, 1, gold);
      for (const wx of [2, 4, 6]) rect(ctx, px + wx, K.y - 5, 1, 5, gold);
      rect(ctx, px + 3, K.y, 3, 1, gold);
      rect(ctx, px + 6, K.y - 9, 1, 1, '#ffffff');
    } else {
      rect(ctx, px + 2, K.y - 8, 5, 5, '#d97a62');
      rect(ctx, px + 3, K.y - 7, 3, 3, '#ffffff');
      rect(ctx, px + 2, K.y - 3, 2, 4, '#d97a62');
      rect(ctx, px + 5, K.y - 3, 2, 4, '#d97a62');
    }
  }
  const phins = has('coffeeBar') ? 4 : 2;
  for (let i = 0; i < phins; i++) {
    // a phin: a little metal filter dripping into a glass
    const px = L.coffee.x + i * 5;
    rect(ctx, px, K.y - 7, 4, 1, '#8c9482');
    rect(ctx, px, K.y - 6, 4, 3, '#cfd6c4');
    rect(ctx, px, K.y - 3, 4, 6, '#ffffff');
    rect(ctx, px, K.y, 4, 3, '#8a5f3a');
    rect(ctx, px, K.y + 2, 4, 1, '#f4e2c0');
  }
  if (phins === 2) {
    // the kettle
    box(ctx, L.coffee.x + 13, K.y - 5, 8, 8, '#d97a62');
    rect(ctx, L.coffee.x + 15, K.y - 7, 4, 2, PAL.ink);
    rect(ctx, L.coffee.x + 11, K.y - 3, 2, 1, PAL.ink);
  }

  // the fridge (with a cat's face), or a plant on a stool where it will go
  const F = L.fridge;
  if (has('fridge')) {
    rect(ctx, F.x, F.y - 2, F.w, 2, '#cfe0b4');
    box(ctx, F.x, F.y, F.w, F.h, '#9dbf78', C.wallEdge);
    rect(ctx, F.x + 1, F.y + 17, F.w - 2, 1, C.wallEdge);
    rect(ctx, F.x + F.w - 3, F.y + 7, 1, 7, '#eef5de');
    rect(ctx, F.x + F.w - 3, F.y + 22, 1, 9, '#eef5de');
    for (const [fx, fy, w] of [[3, 4, 2], [8, 4, 2], [3, 5, 1], [9, 5, 1], [4, 8, 1], [8, 8, 1], [4, 9, 1], [8, 9, 1], [6, 11, 1], [5, 12, 1], [7, 12, 1]]) rect(ctx, F.x + fx, F.y + fy, w, 1, C.wallEdge);
    rect(ctx, F.x + 1, F.y + F.h - 3, F.w - 2, 2, '#7fa36a');
  } else {
    rect(ctx, F.x + 1, 46, 13, 2, C.woodLight);
    rect(ctx, F.x + 1, 48, 13, 1, C.woodDeep);
    rect(ctx, F.x + 2, 49, 1, 8, C.woodDeep);
    rect(ctx, F.x + 12, 49, 1, 8, C.woodDeep);
    // a bread basket waits on the stool
    box(ctx, F.x + 3, 42, 9, 5, '#e0b072', C.woodDeep);
    rect(ctx, F.x + 5, 38, 2, 4, '#c98a5a');
    rect(ctx, F.x + 8, 37, 2, 5, '#d9a066');
  }

  // the oven: brick at first, then tile, then steel
  const O = L.oven;
  const brick = has('oven3') ? '#aab39a' : has('oven2') ? '#e0b072' : '#b8704a';
  rect(ctx, O.x + 14, 0, 11, 5, '#8c9482');
  rect(ctx, O.x + 11, 5, 17, O.y - 5, '#aab39a');
  rect(ctx, O.x + 11, O.y - 1, 17, 1, PAL.ink);
  rect(ctx, O.x, O.y - 2, O.w, 2, 'rgba(255,255,255,0.35)');
  box(ctx, O.x, O.y, O.w, O.h, brick, '#5a3a2a');
  for (let y = O.y + 3, r = 0; y < O.y + O.h - 2; y += 5, r++) for (let x = O.x + 2 + (r % 2) * 3; x < O.x + O.w - 6; x += 7) rect(ctx, x, y, 5, 1, 'rgba(59,42,37,0.22)');
  box(ctx, O.x + 7, O.y + 13, O.w - 14, 21, '#2f2a26', '#3e2a22');
  for (const [cx, cw] of [[O.x + 7, 2], [O.x + O.w - 9, 2]]) rect(ctx, cx, O.y + 13, cw, 1, brick);
  rect(ctx, O.x + 7, O.y + 14, 1, 1, brick);
  rect(ctx, O.x + O.w - 8, O.y + 14, 1, 1, brick);
  rect(ctx, O.x + 5, O.y + 35, O.w - 10, 2, '#e2d6b4');
  rect(ctx, O.x + 5, O.y + 37, O.w - 10, 1, PAL.ink);
  for (let i = 0; i < 3; i++) box(ctx, O.x + 8 + i * 9, O.y + 40, 5, 4, C.cream);

  // pendant lamps, hanging in front of the wall
  for (const lx of LAMPS_X) {
    rect(ctx, lx + 4, 4, 1, 3, PAL.ink);
    rect(ctx, lx, 7, 9, 1, PAL.ink);
    rect(ctx, lx - 1, 8, 11, 3, C.lamp);
    rect(ctx, lx - 1, 11, 11, 1, PAL.ink);
    rect(ctx, lx + 3, 12, 3, 1, '#fff7d6');
  }

  // a bench under the window, the compost bin, and the cat
  if (owns('stools')) {
    box(ctx, 14, 45, 38, 4, C.woodLight, C.woodDeep);
    rect(ctx, 16, 49, 2, 5, C.woodDeep);
    rect(ctx, 48, 49, 2, 5, C.woodDeep);
  }
  // a little table of bread baskets against the right wall
  rect(ctx, 213, 62, 20, 9, C.woodPale);
  rect(ctx, 213, 62, 20, 1, '#f3dcb3');
  rect(ctx, 213, 71, 20, 8, C.wood);
  rect(ctx, 213, 71, 20, 1, C.woodDark);
  rect(ctx, 213, 79, 20, 1, C.woodDeep);
  rect(ctx, 213, 62, 1, 18, C.woodDeep);
  for (const bx of [215, 224]) {
    rect(ctx, bx, 63, 8, 6, '#c9955f');
    rect(ctx, bx, 68, 8, 1, C.woodDeep);
    loaf(ctx, bx + 1, 67, bx);
    rect(ctx, bx + 2, 60, 5, 2, '#e7b56d');
    rect(ctx, bx + 3, 59, 3, 1, '#f7e2b5');
  }
  if (has('compost')) {
    box(ctx, 221, 129, 11, 11, C.leaf, C.wallEdge);
    rect(ctx, 220, 128, 13, 2, C.leafDark);
    rect(ctx, 225, 133, 3, 3, '#cfe0b4');
  }
  if (has('corner')) shopCat(ctx, 9, 106);
  else shopCat(ctx, 208, 148);
}

/**
 * The inside of the window: frame, middle bar, glass shine, sill and the plants on it.
 * Drawn over the street life, so passers-by and traffic stay behind the glass and the pots.
 */
export function drawWindowFront(ctx: CanvasRenderingContext2D, o: SceneOpts) {
  const W = LAYOUT.window;
  // the frame as a ring, so the street shows through the middle
  rect(ctx, W.x, W.y, W.w, 2, C.frame);
  rect(ctx, W.x, W.y + W.h - 2, W.w, 2, C.frame);
  rect(ctx, W.x, W.y, 2, W.h, C.frame);
  rect(ctx, W.x + W.w - 2, W.y, 2, W.h, C.frame);
  rect(ctx, W.x, W.y, W.w, 1, C.wallEdge);
  rect(ctx, W.x, W.y + W.h - 1, W.w, 1, C.wallEdge);
  rect(ctx, W.x, W.y, 1, W.h, C.wallEdge);
  rect(ctx, W.x + W.w - 1, W.y, 1, W.h, C.wallEdge);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (const px of [W.x + 4, W.x + W.w / 2 + 3])
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(px + i, W.y + 8 - i, 1, 1);
      ctx.fillRect(px + 3 + i, W.y + 10 - i, 1, 1);
    }
  rect(ctx, W.x - 1, W.y + W.h, W.w + 2, 3, C.woodLight);
  rect(ctx, W.x - 1, W.y + W.h + 2, W.w + 2, 1, C.woodDark);
  if (o.upgrades.includes('garden'))
    for (let i = 0; i < 4; i++) {
      box(ctx, W.x + 2 + i * 11, W.y + W.h - 4, 9, 5, C.pot, C.woodDeep);
      rect(ctx, W.x + 3 + i * 11, W.y + W.h - 7, 7, 3, C.leaf);
      rect(ctx, W.x + 4 + i * 11 + (i % 2) * 3, W.y + W.h - 8, 2, 2, ['#efb6a0', '#f4dc8c', '#d97a62', '#ffffff'][i]);
    }
}

/** The service counter and glass case: in front of the staff, behind the customers. */
export function drawCounter(ctx: CanvasRenderingContext2D, o: SceneOpts) {
  const K = LAYOUT.counter;
  const counter = at(COUNTERS, o.style?.counter);
  // top face, then the front with its panels
  rect(ctx, K.x, K.y, K.w, 10, counter.top);
  rect(ctx, K.x, K.y, K.w, 1, 'rgba(255,255,255,0.35)');
  rect(ctx, K.x, K.y + 10, K.w, 20, counter.body);
  rect(ctx, K.x, K.y + 10, K.w, 1, 'rgba(62,74,54,0.3)');
  for (let x = 133; x + 12 <= K.x + K.w - 2; x += 15) {
    rect(ctx, x, K.y + 14, 12, 12, 'rgba(255,255,255,0.22)');
    rect(ctx, x, K.y + 14, 12, 1, 'rgba(62,74,54,0.2)');
    rect(ctx, x, K.y + 14, 1, 12, 'rgba(62,74,54,0.2)');
    rect(ctx, x + 5, K.y + 19, 2, 2, counter.top);
  }
  rect(ctx, K.x, K.y + 29, K.w, 1, C.woodDeep);
  rect(ctx, K.x, K.y, 1, 30, C.woodDeep);
  rect(ctx, K.x + K.w - 1, K.y, 1, 30, C.woodDeep);

  // the glass case: a glass top, and a glass front you can see the pastries through
  const S = LAYOUT.case;
  rect(ctx, S.x, K.y + 1, S.w, 8, '#eaf3e2');
  rect(ctx, S.x, K.y + 1, S.w, 1, '#ffffff');
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(S.x + 6 + i, K.y + 7 - i, 1, 1);
    ctx.fillRect(S.x + 10 + i, K.y + 7 - i, 1, 1);
    ctx.fillRect(S.x + 44 + i, K.y + 7 - i, 1, 1);
  }
  rect(ctx, S.x - 1, K.y, 1, 10, C.woodDeep);
  rect(ctx, S.x + S.w, K.y, 1, 10, C.woodDeep);
  box(ctx, S.x - 1, S.y, S.w + 2, S.h, '#fbf6e6', C.woodDeep);
  rect(ctx, S.x, S.y + S.h - 4, S.w, 3, C.woodLight);
  for (let i = 0; i < 4; i++) rect(ctx, S.x + 3 + i * 2, S.y + 2 + i, 1, 4, 'rgba(255,255,255,0.95)');
  if (o.upgrades.includes('display')) rect(ctx, S.x, S.y + 1, S.w, 1, '#e3b23c');

  // the register, and a vase of fresh flowers
  const R = LAYOUT.register;
  box(ctx, R.x, R.y, R.w, R.h, '#f2e2bd');
  rect(ctx, R.x + 2, R.y + 2, R.w - 4, 3, '#9dbf78');
  for (let i = 0; i < 3; i++) rect(ctx, R.x + 3 + i * 3, R.y + 6, 2, 1, C.woodDeep);
  rect(ctx, R.x + 2, R.y + 8, R.w - 4, 1, PAL.ink);
  if (o.decor.includes('flowers')) {
    box(ctx, 183, 60, 6, 8, '#dde7c4');
    for (const [fx, fy, c] of [[182, 56, '#efb6a0'], [185, 54, '#f4dc8c'], [188, 57, '#d97a62']] as const) rect(ctx, fx, fy, 3, 3, c);
    rect(ctx, 184, 58, 1, 2, C.leaf);
    rect(ctx, 187, 58, 1, 2, C.leaf);
  }
}

/** Tables, chairs and the wall nearest you: in front of the queue, behind anyone sitting down. */
export function drawFront(ctx: CanvasRenderingContext2D, o: SceneOpts) {
  const L = LAYOUT;
  for (const tx of L.tables) cafeTable(ctx, tx);
  if (o.upgrades.includes('corner')) cafeTable(ctx, L.cornerTable);
  rect(ctx, 0, L.bottomY, STAGE_W, STAGE_H - L.bottomY, C.wallCap);
  rect(ctx, 0, L.bottomY, STAGE_W, 1, C.wallEdge);
  rect(ctx, 0, STAGE_H - 2, STAGE_W, 1, C.wallCapHi);
  // the doorway stays open so you can see people come and go
  ctx.clearRect(L.door.x, L.bottomY, L.door.w, STAGE_H - L.bottomY);
  rect(ctx, L.door.x - 1, L.bottomY, 1, STAGE_H - L.bottomY, C.wallEdge);
  rect(ctx, L.door.x + L.door.w, L.bottomY, 1, STAGE_H - L.bottomY, C.wallEdge);
}
