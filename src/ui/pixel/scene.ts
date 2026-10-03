import type { DecorId, ShopStyle, UpgradeId, Weather } from '../../engine/types';
import { PAL } from './palette';
import { paint } from './render';
import { SPRITES } from './sprites';
import { SPRITE_COLORS } from './palette';

export const STAGE_W = 240;
export const STAGE_H = 135;

/** Fixed layout of the room, in stage pixels. */
export const LAYOUT = {
  floorY: 96,
  door: { x: 4, y: 50, w: 24, h: 46 },
  window: { x: 32, y: 16, w: 64, h: 54 },
  board: { x: 102, y: 12, w: 48, h: 34 },
  shelf: { x: 102, y: 52, w: 48 },
  fridge: { x: 152, y: 58, w: 13, h: 38 },
  coffee: { x: 166, y: 78, w: 32, h: 18 },
  oven: { x: 201, y: 38, w: 36, h: 58 },
  counter: { x: 112, y: 104, w: 100, h: 20 },
  case: { x: 114, y: 84, w: 64, h: 20 },
  register: { x: 194, y: 92, w: 14, h: 12 },
  player: { x: 184, feet: 106 },
  helper: { x: 172, feet: 90 },
  queueY: 131,
  queueX: [146, 127, 108, 89],
  doorX: 10,
};

/** Left edge of each pendant lamp's shade; its glow centres on lx + 4. */
export const LAMPS_X = [12, 160];

export type Light = 0 | 1 | 2 | 3 | 4;

export interface SceneOpts {
  weather: Weather;
  light: Light;
  decor: DecorId[];
  upgrades: UpgradeId[];
  tet: boolean;
  competitor: boolean;
  style?: ShopStyle;
  /** The Lantern Festival prize on the wall. */
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
];
export const PATTERNS = ['Stripes', 'Plain', 'Dots', 'Checks'];
export const FLOORS = [
  { name: 'Wood', a: '#d9a76a', b: '#d9a76a', line: '#a87545', tiles: false },
  { name: 'Cream tiles', a: '#f4ead0', b: '#e6d9b4', line: '#cdbd94', tiles: true },
  { name: 'Terracotta', a: '#e0a57c', b: '#cf8d68', line: '#a8664a', tiles: true },
  { name: 'Dark wood', a: '#b98363', b: '#b98363', line: '#7e5a48', tiles: false },
];
export const COUNTERS = [
  { name: 'Wood and green', body: '#d9b07a', top: '#4f7d46' },
  { name: 'Pink', body: '#f8e1e8', top: '#d97a62' },
  { name: 'Blue', body: '#e1e8f5', top: '#b8cfd6' },
  { name: 'Wood', body: '#e0b072', top: '#a87545' },
];
/** Where movable decorations can go (stage px, left edge). */
export const FLOOR_SPOTS = [28, 58, 88];
export const CAGE_SPOTS = [1, 176, 227];
const at = <T,>(list: T[], i: number | undefined): T => list[(i ?? 0) % list.length] ?? list[0];

/** Sky through the window by weather, for dawn, morning, midday, golden hour and night. */
const SKY: Record<Weather, string[]> = {
  sunny: ['#fbe5c0', '#d6e9e3', '#cfe6e4', '#f3c98a', '#3e4a36'],
  cloudy: ['#f1e3c8', '#dbe4dc', '#d5dfd8', '#e8c99a', '#3e4a36'],
  rainy: ['#b8cfd6', '#aab9b0', '#aab9b0', '#8c9a88', '#3e4a36'],
  hot: ['#fbe2a8', '#f6e7b8', '#f4e2a4', '#f0b874', '#3e4a36'],
  cool: ['#f2ead8', '#d9e8e6', '#d3e5e6', '#ebcb98', '#3e4a36'],
};

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, line = PAL.ink) {
  rect(ctx, x, y, w, h, line);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

function sprite(ctx: CanvasRenderingContext2D, name: string, x: number, y: number) {
  const rows = SPRITES[name];
  if (rows) paint(ctx, [rows], SPRITE_COLORS, x, y);
}


export function drawStreet(ctx: CanvasRenderingContext2D, o: SceneOpts) {
  const { x, y, w, h } = LAYOUT.window;
  const ix = x + 2;
  const iy = y + 2;
  const iw = w - 4;
  const ih = h - 4;
  const sky = SKY[o.weather][o.light];
  // Nothing outside may paint over the window frame.
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, iw, ih);
  ctx.clip();
  rect(ctx, ix, iy, iw, ih, sky);
  if (o.light === 4) for (const [sx, sy] of [[ix + 6, iy + 4], [ix + 22, iy + 8], [ix + 40, iy + 3], [ix + 54, iy + 9]]) rect(ctx, sx, sy, 1, 1, '#f7f0dc');
  // power lines
  ctx.fillStyle = 'rgba(59,42,37,0.55)';
  for (let i = 0; i < iw; i++) {
    ctx.fillRect(ix + i, iy + 8 + Math.round(3 * Math.sin((i / iw) * Math.PI)), 1, 1);
    ctx.fillRect(ix + i, iy + 11 + Math.round(4 * Math.sin((i / iw) * Math.PI)), 1, 1);
  }
  // building across the street
  const bx = ix + 4;
  const by = iy + 14;
  rect(ctx, bx, by, 34, 26, o.light === 4 ? '#3e4a36' : '#dde7c4');
  rect(ctx, bx, by, 34, 2, PAL.ink);
  for (let i = 0; i < 3; i++) box(ctx, bx + 3 + i * 10, by + 4, 7, 6, o.light >= 3 ? '#eee3a8' : '#dde7c4');
  // shop awning: flowers, or Cô Tư's bánh mì stand later in the year
  const awn = o.competitor ? ['#a87545', '#f7f0dc'] : ['#4f7d46', '#f7f0dc'];
  for (let i = 0; i < 34; i++) rect(ctx, bx + i, by + 13, 1, 3, awn[Math.floor(i / 3) % 2]);
  rect(ctx, bx, by + 16, 34, 10, o.light === 4 ? '#3e4a36' : '#f7f0dc');
  box(ctx, bx + 4, by + 18, 12, 8, '#3e4a36');
  if (o.competitor) box(ctx, bx + 19, by + 18, 12, 7, '#e0b072');
  else for (let i = 0; i < 4; i++) rect(ctx, bx + 19 + i * 3, by + 20, 2, 2, ['#d97a62', '#e0b072', '#f7f0dc', '#a87545'][i]);
  // second building and a tree
  rect(ctx, ix + 41, iy + 8, 18, 32, o.light === 4 ? '#3e4a36' : '#f7f0dc');
  rect(ctx, ix + 41, iy + 8, 18, 2, PAL.ink);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) box(ctx, ix + 43 + c * 8, iy + 12 + r * 9, 6, 6, o.light >= 3 ? '#eee3a8' : '#dde7c4');
  rect(ctx, ix + 37, iy + 24, 3, 18, PAL.coffee);
  for (const [tx, ty, r] of [[38, 18, 7], [33, 22, 5], [43, 22, 5]]) {
    ctx.fillStyle = o.light === 4 ? '#3e4a36' : PAL.pandan;
    ctx.beginPath();
    ctx.arc(ix + tx, iy + ty, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // sidewalk and road
  rect(ctx, ix, iy + 40, iw, 3, '#e2d6b4');
  rect(ctx, ix, iy + 43, iw, ih - 43, o.light === 4 ? '#3e4a36' : '#6b7560');
  for (let i = 2; i < iw; i += 10) rect(ctx, ix + i, iy + 46, 5, 1, '#f2e2bd');
  if (o.decor.includes('bike')) {
    rect(ctx, ix + 48, iy + 36, 12, 1, PAL.ink);
    for (const wx of [ix + 48, ix + 58]) box(ctx, wx - 2, iy + 37, 5, 5, '#f7f0dc');
    box(ctx, ix + 46, iy + 32, 6, 4, '#d97a62');
  }
  ctx.restore();
}

/** The room's palette: off-white, light green and pink, with a warm wooden floor. */
const ROOM = {
  cornice: '#4f7d46',
  wall: '#f7efd8',
  wallStripe: '#efe3c4',
  trim: '#a87545',
  dado: '#cfdcb0',
  dadoPanel: '#dbe6c0',
  dadoLine: '#b5c795',
  lamp: '#f4dc8c',
  plank: '#d9a76a',
  plankLine: '#a87545',
  plankHi: '#d9a76a',
  table: '#f7efd8',
  tableCheck: '#9dbf78',
  tableRim: '#f7efd8',
  tableLeg: '#7a5434',
  chair: '#b98352',
  chairLeg: '#7a5434',
  counter: '#d9b07a',
  counterTop: '#4f7d46',
  counterPanel: '#d9b07a',
  caseBase: '#d9b07a',
  register: '#4f7d46',
  frame: '#4f7d46',
  sill: '#d9b07a',
  door: '#7fa36a',
  shelf: '#a87545',
  shelfDark: '#7a5434',
  leaf: '#6f9e58',
  leafDark: '#4f7d46',
  pot: '#c98a5a',
};

/** A little round café table with two chairs and a cake. (tx, ty) is the table's left/top. */
function cafeTable(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
  // wooden chairs with a slatted back
  for (const cx of [tx - 7, tx + 15]) {
    rect(ctx, cx, ty - 6, 6, 8, ROOM.chair);
    rect(ctx, cx, ty - 6, 6, 1, ROOM.chairLeg);
    rect(ctx, cx + 2, ty - 5, 2, 5, ROOM.chairLeg);
    rect(ctx, cx, ty + 2, 6, 1, ROOM.chairLeg);
    rect(ctx, cx + 1, ty + 3, 1, 5, ROOM.chairLeg);
    rect(ctx, cx + 4, ty + 3, 1, 5, ROOM.chairLeg);
  }
  // a green gingham tablecloth that hangs over the edge
  rect(ctx, tx - 1, ty, 16, 7, ROOM.table);
  for (let y = 0; y < 7; y += 2) for (let x = (y / 2) % 2 ? 1 : 0; x < 16; x += 2) rect(ctx, tx - 1 + x, ty + y, 1, 1, ROOM.tableCheck);
  rect(ctx, tx - 1, ty + 6, 16, 1, ROOM.leafDark);
  rect(ctx, tx + 6, ty + 7, 2, 5, ROOM.tableLeg);
  rect(ctx, tx + 3, ty + 12, 8, 1, ROOM.tableLeg);
  // a little vase of flowers and a cup
  rect(ctx, tx + 2, ty - 3, 2, 3, '#f7efd8');
  rect(ctx, tx + 1, ty - 5, 1, 2, ROOM.leaf);
  rect(ctx, tx + 3, ty - 6, 1, 2, '#f4dc8c');
  rect(ctx, tx + 2, ty - 5, 1, 1, '#efb6a0');
  rect(ctx, tx + 9, ty - 2, 3, 2, '#ffffff');
  rect(ctx, tx + 9, ty - 3, 3, 1, ROOM.shelfDark);
}

/** A loaf, a baguette or a round bun on a shelf, sitting on `y`. */
function loaf(ctx: CanvasRenderingContext2D, x: number, y: number, kind: number) {
  const crust = ['#c98a4a', '#d9a05a', '#b8763c'][kind % 3];
  const top = ['#e7b56d', '#efc27a', '#d79552'][kind % 3];
  if (kind % 3 === 1) {
    // baguette lying down
    rect(ctx, x, y - 2, 9, 2, crust);
    rect(ctx, x + 1, y - 3, 7, 1, top);
    for (const sx of [2, 5]) rect(ctx, x + sx, y - 3, 1, 1, '#f7e2b5');
  } else {
    rect(ctx, x, y - 3, 6, 3, crust);
    rect(ctx, x + 1, y - 4, 4, 1, top);
    rect(ctx, x + 1, y - 3, 4, 1, top);
    rect(ctx, x + 2, y - 4, 1, 1, '#f7e2b5');
  }
}

/** A plant in a terracotta pot, standing on `y`. */
function pottedPlant(ctx: CanvasRenderingContext2D, x: number, y: number, size = 1) {
  rect(ctx, x, y - 4, 5, 4, ROOM.pot);
  rect(ctx, x - 1, y - 5, 7, 1, ROOM.shelfDark);
  const leaves = size === 1 ? [[1, -7], [0, -8], [3, -8], [4, -7], [2, -9]] : [[1, -7], [0, -9], [3, -9], [4, -7], [2, -11], [-1, -7], [5, -9], [1, -11], [3, -12]];
  for (const [lx, ly] of leaves) rect(ctx, x + lx, y + ly, 2, 2, (lx + ly) % 2 ? ROOM.leaf : ROOM.leafDark);
}

/** A hanging basket with trailing vines. */
function hangingPlant(ctx: CanvasRenderingContext2D, x: number, drop: number) {
  rect(ctx, x + 3, 7, 1, drop, ROOM.shelfDark);
  const py = 7 + drop;
  rect(ctx, x, py, 7, 4, ROOM.pot);
  rect(ctx, x, py, 7, 1, ROOM.shelfDark);
  for (const [lx, ly] of [[-1, -1], [1, -2], [4, -2], [6, -1], [2, -3]]) rect(ctx, x + lx, py + ly, 2, 2, ROOM.leaf);
  // vines trail down either side
  for (const [vx, len] of [[-1, 10], [1, 6], [5, 8], [7, 12]] as const)
    for (let i = 0; i < len; i++) rect(ctx, x + vx + (i % 4 === 3 ? 1 : 0), py + 4 + i, 1, 1, i % 3 === 0 ? ROOM.leaf : ROOM.leafDark);
}

export function drawRoom(ctx: CanvasRenderingContext2D, o: SceneOpts) {
  const L = LAYOUT;
  // ceiling: a pink cornice; walls: off-white with faint pink stripes above a light-green wainscot
  rect(ctx, 0, 0, STAGE_W, 6, ROOM.cornice);
  rect(ctx, 0, 6, STAGE_W, 1, PAL.ink);
  const wall = at(WALLS, o.style?.wall);
  const pattern = (o.style?.pattern ?? 0) % PATTERNS.length;
  rect(ctx, 0, 7, STAGE_W, 69, wall.c);
  if (pattern === 0) for (let x = 1; x < STAGE_W; x += 6) rect(ctx, x, 7, 2, 69, wall.accent);
  if (pattern === 2) for (let y = 11, r = 0; y < 74; y += 7, r++) for (let x = 3 + (r % 2 ? 4 : 0); x < STAGE_W; x += 8) rect(ctx, x, y, 2, 2, wall.accent);
  if (pattern === 3) for (let y = 7, r = 0; y < 76; y += 8, r++) for (let x = (r % 2) * 8; x < STAGE_W; x += 16) rect(ctx, x, y, 8, Math.min(8, 76 - y), wall.accent);
  rect(ctx, 0, 74, STAGE_W, 2, ROOM.trim);
  rect(ctx, 0, 76, STAGE_W, 20, ROOM.dado);
  for (let x = 4; x < STAGE_W; x += 24) {
    rect(ctx, x, 79, 16, 14, ROOM.dadoPanel);
    rect(ctx, x, 79, 16, 1, ROOM.dadoLine);
    rect(ctx, x, 79, 1, 14, ROOM.dadoLine);
  }
  rect(ctx, 0, 75, STAGE_W, 1, PAL.ink);
  // pendant lamps: one over the door, one between the menu and the oven, never over the glass
  for (const lx of LAMPS_X) {
    rect(ctx, lx + 4, 7, 1, 9, PAL.ink);
    rect(ctx, lx, 16, 9, 1, PAL.ink);
    rect(ctx, lx - 1, 17, 11, 4, ROOM.lamp);
    rect(ctx, lx - 1, 21, 11, 1, PAL.ink);
    rect(ctx, lx + 3, 22, 3, 1, '#f7f0dc');
  }
  // wooden floor: planks with staggered joints
  const floor = at(FLOORS, o.style?.floor);
  rect(ctx, 0, L.floorY, STAGE_W, STAGE_H - L.floorY, floor.a);
  if (floor.tiles) {
    for (let y = L.floorY, r = 0; y < STAGE_H; y += 8, r++) for (let x = r % 2 ? 12 : 0; x < STAGE_W; x += 24) rect(ctx, x, y, 12, 8, floor.b);
    for (let y = L.floorY; y < STAGE_H; y += 8) rect(ctx, 0, y, STAGE_W, 1, floor.line);
  } else
    for (let y = L.floorY; y < STAGE_H; y += 6) {
      rect(ctx, 0, y, STAGE_W, 1, floor.line);
      const off = ((y - L.floorY) / 6) % 2 ? 12 : 0;
      for (let x = off; x < STAGE_W; x += 24) rect(ctx, x, y + 1, 1, 5, floor.line);
    }
  rect(ctx, 0, L.floorY, STAGE_W, 1, PAL.ink);
  // guest tables by the window: round pink tops, mint chairs, something sweet on each
  for (const [tx, ty] of [[38, 108], [76, 108]] as const) cafeTable(ctx, tx, ty);

  // loft railing
  if (o.upgrades.includes('loft')) {
    rect(ctx, 0, 6, STAGE_W, 3, PAL.crust);
    for (let x = 2; x < STAGE_W; x += 6) rect(ctx, x, 9, 2, 5, PAL.coffee);
    rect(ctx, 0, 14, STAGE_W, 2, PAL.crust);
  }

  // window
  const W = L.window;
  box(ctx, W.x, W.y, W.w, W.h, ROOM.frame);
  drawStreet(ctx, o);
  // a little shine on each pane so it reads as glass
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (const px of [W.x + 4, W.x + W.w / 2 + 3])
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(px + i, W.y + 9 - i, 1, 1);
      ctx.fillRect(px + 3 + i, W.y + 12 - i, 1, 1);
    }
  rect(ctx, W.x + W.w / 2 - 1, W.y, 2, W.h, ROOM.frame);
  rect(ctx, W.x - 2, W.y + W.h, W.w + 4, 3, ROOM.sill);
  if (o.upgrades.includes('garden'))
    for (let i = 0; i < 4; i++) {
      box(ctx, W.x + 4 + i * 15, W.y + W.h - 5, 8, 5, PAL.orangeDark);
      rect(ctx, W.x + 5 + i * 15, W.y + W.h - 9, 6, 4, PAL.pandan);
    }

  // the Lantern Festival prize, on the wall above the door
  if (o.prize) {
    box(ctx, 5, 30, 22, 16, '#f7f0dc');
    if (o.prize === 'won') {
      rect(ctx, 15, 33, 2, 5, '#e3b23c');
      for (const wx of [12, 15, 18]) rect(ctx, wx, 37, 2, 6, '#e3b23c');
      rect(ctx, 12, 42, 8, 1, '#e3b23c');
      rect(ctx, 22, 32, 2, 2, '#ffffff');
    } else {
      rect(ctx, 12, 33, 8, 7, PAL.pink);
      rect(ctx, 14, 35, 4, 3, '#ffffff');
      rect(ctx, 12, 40, 3, 4, PAL.pink);
      rect(ctx, 17, 40, 3, 4, PAL.pink);
    }
  }

  // door
  const D = L.door;
  box(ctx, D.x, D.y, D.w, D.h, ROOM.frame);
  box(ctx, D.x + 3, D.y + 3, D.w - 6, 24, SKY[o.weather][o.light]);
  rect(ctx, D.x + 3, D.y + 30, D.w - 6, D.h - 33, ROOM.door);
  rect(ctx, D.x + D.w - 5, D.y + 30, 2, 2, PAL.mango);
  box(ctx, D.x + 5, D.y + 8, 14, 7, PAL.cream);

  // menu board and shelf
  const B = L.board;
  box(ctx, B.x - 2, B.y - 2, B.w + 4, B.h + 4, PAL.crust);
  rect(ctx, B.x, B.y, B.w, B.h, '#3e4a36');
  rect(ctx, L.shelf.x - 2, L.shelf.y, L.shelf.w + 4, 3, PAL.crust);
  rect(ctx, L.shelf.x - 2, L.shelf.y + 3, L.shelf.w + 4, 1, PAL.ink);
  const jars = [PAL.mango, PAL.pink, PAL.leaf, PAL.coffee, PAL.orange];
  jars.forEach((c, i) => {
    box(ctx, L.shelf.x + 2 + i * 9, L.shelf.y - 8, 7, 8, '#f7f0dc');
    rect(ctx, L.shelf.x + 3 + i * 9, L.shelf.y - 5, 5, 4, c);
    rect(ctx, L.shelf.x + 2 + i * 9, L.shelf.y - 9, 7, 2, PAL.crust);
  });
  if (o.decor.includes('radio')) {
    box(ctx, L.shelf.x + 30, L.shelf.y - 9, 14, 9, PAL.red);
    rect(ctx, L.shelf.x + 32, L.shelf.y - 7, 5, 5, PAL.ink);
    rect(ctx, L.shelf.x + 39, L.shelf.y - 7, 3, 2, PAL.cream);
  }

  // a wooden bread shelf on the back wall, full of the morning's loaves
  for (const sy of [48, 62]) {
    rect(ctx, 152, sy, 46, 2, ROOM.shelf);
    rect(ctx, 152, sy + 2, 46, 1, ROOM.shelfDark);
    rect(ctx, 154, sy + 3, 1, 3, ROOM.shelfDark);
    rect(ctx, 195, sy + 3, 1, 3, ROOM.shelfDark);
    for (let i = 0; i < 5; i++) loaf(ctx, 154 + i * 9, sy, i + sy);
  }
  if (!o.decor.includes('art')) for (const [hx, drop] of [[176, 10]] as const) hangingPlant(ctx, hx, drop);
  hangingPlant(ctx, 226, 6);
  if (!o.upgrades.includes('garden')) for (const px of [38, 62, 86]) pottedPlant(ctx, px, 70);
  pottedPlant(ctx, 141, 52);

  // lacquer art
  if (o.decor.includes('art')) {
    box(ctx, 158, 18, 32, 22, PAL.mango);
    rect(ctx, 160, 20, 28, 18, '#3e4a36');
    rect(ctx, 162, 30, 24, 6, PAL.redDark);
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.arc(181, 26, 3, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, 166, 27, 2, 9, PAL.gold);
    rect(ctx, 165, 27, 6, 1, PAL.gold);
  }

  // fridge
  if (o.upgrades.includes('fridge')) {
    const F = L.fridge;
    box(ctx, F.x, F.y, F.w, F.h, '#f7f0dc');
    rect(ctx, F.x + 1, F.y + 13, F.w - 2, 1, PAL.ink);
    rect(ctx, F.x + F.w - 4, F.y + 4, 1, 6, PAL.stoneDark);
    rect(ctx, F.x + F.w - 4, F.y + 17, 1, 8, PAL.stoneDark);
  }

  // coffee station
  const C = L.coffee;
  box(ctx, C.x, C.y, C.w, C.h, ROOM.counter);
  rect(ctx, C.x + 1, C.y + 1, C.w - 2, 2, ROOM.counterTop);
  for (let i = 0; i < 2; i++) box(ctx, C.x + 3 + i * 14, C.y + 6, 12, 10, '#a87545');
  const phins = o.upgrades.includes('coffeeBar') ? 4 : 2;
  for (let i = 0; i < phins; i++) {
    const px = C.x + 3 + i * 7;
    box(ctx, px, C.y - 9, 6, 4, '#e2d6b4');
    box(ctx, px + 1, C.y - 5, 4, 5, '#f7f0dc');
    rect(ctx, px + 2, C.y - 3, 2, 3, PAL.coffee);
  }
  box(ctx, C.x + C.w - 7, C.y - 7, 6, 7, PAL.red);
  rect(ctx, C.x + C.w - 6, C.y - 5, 4, 2, PAL.coconut);

  // oven
  const O = L.oven;
  box(ctx, O.x, O.y, O.w, O.h, o.upgrades.includes('oven3') ? '#aab39a' : o.upgrades.includes('oven2') ? '#e0b072' : '#a87545');
  for (let y = O.y + 3; y < O.y + O.h - 2; y += 5) for (let x = O.x + 2 + ((y / 5) % 2) * 3; x < O.x + O.w - 3; x += 7) rect(ctx, x, y, 5, 1, 'rgba(59,42,37,0.25)');
  box(ctx, O.x + 5, O.y + 14, O.w - 10, 20, '#3e4a36');
  rect(ctx, O.x + 4, O.y + 36, O.w - 8, 2, PAL.ink);
  for (let i = 0; i < 3; i++) box(ctx, O.x + 7 + i * 8, O.y + 41, 5, 5, PAL.stone);
  rect(ctx, O.x + 4, O.y - 4, O.w - 8, 4, PAL.stoneDark);
  rect(ctx, O.x + 12, O.y - 14, 10, 10, PAL.stoneDark);
  rect(ctx, O.x + 12, O.y - 14, 10, 1, PAL.ink);

  if (o.upgrades.includes('compost')) {
    box(ctx, 226, 84, 12, 12, PAL.pandan);
    rect(ctx, 228, 88, 8, 1, PAL.forest);
  }
  // the coffee corner adds a third table; stools add a bench under the window
  if (o.upgrades.includes('corner')) cafeTable(ctx, 100, 100);
  if (o.decor.includes('stools')) {
    box(ctx, 34, 98, 60, 3, ROOM.chair);
    rect(ctx, 36, 101, 2, 4, ROOM.chairLeg);
    rect(ctx, 90, 101, 2, 4, ROOM.chairLeg);
  }
  if (o.decor.includes('rug')) {
    rect(ctx, 86, 126, 76, 8, '#e0b072');
    for (let x = 88; x < 160; x += 4) rect(ctx, x, 128, 2, 4, '#a87545');
    rect(ctx, 86, 126, 76, 1, PAL.crust);
  }
}

/** The counter sits in front of the player but behind customers. */
export function drawCounter(ctx: CanvasRenderingContext2D, o: SceneOpts) {
  const K = LAYOUT.counter;
  const counter = at(COUNTERS, o.style?.counter);
  box(ctx, K.x, K.y, K.w, K.h, counter.body);
  rect(ctx, K.x - 2, K.y - 2, K.w + 4, 3, counter.top);
  rect(ctx, K.x - 2, K.y - 2, K.w + 4, 1, PAL.ink);
  for (let x = K.x + 4; x < K.x + K.w - 4; x += 12) {
    rect(ctx, x, K.y + 4, 9, 11, counter.body);
    rect(ctx, x, K.y + 4, 9, 1, ROOM.dadoLine);
    rect(ctx, x, K.y + 4, 1, 11, ROOM.dadoLine);
    rect(ctx, x + 3, K.y + 8, 3, 3, ROOM.trim);
  }
  const S = LAYOUT.case;
  // Glass you can see through: whoever works behind the case shows, a little misty.
  ctx.clearRect(S.x + 1, S.y + 1, S.w - 2, S.h - 5);
  rect(ctx, S.x, S.y, S.w, 1, PAL.ink);
  rect(ctx, S.x, S.y, 1, S.h, PAL.ink);
  rect(ctx, S.x + S.w - 1, S.y, 1, S.h, PAL.ink);
  rect(ctx, S.x, S.y + S.h - 1, S.w, 1, PAL.ink);
  rect(ctx, S.x + 1, S.y + 1, S.w - 2, S.h - 5, 'rgba(238,237,227,0.55)');
  rect(ctx, S.x + 1, S.y + S.h - 4, S.w - 2, 3, ROOM.caseBase);
  for (let i = 0; i < 4; i++) rect(ctx, S.x + 4 + i * 2, S.y + 2 + i, 1, 4, 'rgba(255,255,255,0.9)');
  if (o.upgrades.includes('display')) rect(ctx, S.x + 1, S.y + 1, S.w - 2, 1, PAL.mango);
  // the shop cat, asleep on a green cushion by the oven
  rect(ctx, 215, 125, 22, 5, ROOM.leafDark);
  rect(ctx, 216, 124, 20, 2, ROOM.leaf);
  const fur = '#f0b56e';
  rect(ctx, 219, 118, 14, 6, fur);
  rect(ctx, 220, 117, 12, 1, fur);
  rect(ctx, 219, 120, 4, 4, '#ffffff');
  for (const sx of [224, 228]) rect(ctx, sx, 118, 2, 1, '#d48d48');
  rect(ctx, 217, 119, 5, 4, fur);
  rect(ctx, 217, 118, 1, 1, fur);
  rect(ctx, 221, 118, 1, 1, fur);
  rect(ctx, 218, 121, 1, 1, PAL.ink);
  rect(ctx, 220, 121, 1, 1, PAL.ink);
  rect(ctx, 231, 122, 5, 2, fur);
  rect(ctx, 235, 121, 1, 1, '#d48d48');

  const R = LAYOUT.register;
  box(ctx, R.x, R.y, R.w, R.h, ROOM.register);
  rect(ctx, R.x + 2, R.y + 2, R.w - 4, 3, '#dde7c4');
  rect(ctx, R.x + 2, R.y + 7, R.w - 4, 1, PAL.ink);
  if (o.decor.includes('flowers')) {
    box(ctx, 180, 96, 6, 8, '#dde7c4');
    for (const [fx, fy, c] of [[179, 92, PAL.pink], [183, 90, PAL.mango], [186, 93, PAL.red]] as const) rect(ctx, fx, fy, 3, 3, c);
  }
}

export function sceneSprite(ctx: CanvasRenderingContext2D, name: string, x: number, y: number) {
  sprite(ctx, name, x, y);
}
