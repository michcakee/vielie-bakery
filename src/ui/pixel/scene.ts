import type { DecorId, UpgradeId, Weather } from '../../engine/types';
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
  player: { x: 180, feet: 106 },
  helper: { x: 172, feet: 90 },
  queueY: 131,
  queueX: [150, 134, 118, 102],
  doorX: 10,
};

export type Light = 0 | 1 | 2 | 3 | 4;

export interface SceneOpts {
  weather: Weather;
  light: Light;
  decor: DecorId[];
  upgrades: UpgradeId[];
  tet: boolean;
  competitor: boolean;
}

const SKY: Record<Weather, string[]> = {
  sunny: ['#ffe6b0', '#bfe3ef', '#bfe3ef', '#f6b98a', '#2b3049'],
  cloudy: ['#efe2c8', '#d5dfe0', '#d5dfe0', '#d9b59a', '#30364a'],
  rainy: ['#b8c4c6', '#9fb0b5', '#9fb0b5', '#8f8e96', '#262b3a'],
  hot: ['#ffd99a', '#ffe7a8', '#ffd28a', '#f39a6a', '#2f2b45'],
  cool: ['#e6eef0', '#c9e2ec', '#c9e2ec', '#e3b9a0', '#283048'],
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
  if (o.light === 4) for (const [sx, sy] of [[ix + 6, iy + 4], [ix + 22, iy + 8], [ix + 40, iy + 3], [ix + 54, iy + 9]]) rect(ctx, sx, sy, 1, 1, '#fff4de');
  // power lines
  ctx.fillStyle = 'rgba(59,42,37,0.55)';
  for (let i = 0; i < iw; i++) {
    ctx.fillRect(ix + i, iy + 8 + Math.round(3 * Math.sin((i / iw) * Math.PI)), 1, 1);
    ctx.fillRect(ix + i, iy + 11 + Math.round(4 * Math.sin((i / iw) * Math.PI)), 1, 1);
  }
  // building across the street
  const bx = ix + 4;
  const by = iy + 14;
  rect(ctx, bx, by, 34, 26, o.light === 4 ? '#6a5560' : '#f2b6b6');
  rect(ctx, bx, by, 34, 2, PAL.ink);
  for (let i = 0; i < 3; i++) box(ctx, bx + 3 + i * 10, by + 4, 7, 6, o.light >= 3 ? '#ffd98a' : '#cfe8f0');
  // shop awning: flowers, or Cô Tư's bánh mì stand later in the year
  const awn = o.competitor ? ['#c2453d', '#fff4de'] : ['#6fa84b', '#fff4de'];
  for (let i = 0; i < 34; i++) rect(ctx, bx + i, by + 13, 1, 3, awn[Math.floor(i / 3) % 2]);
  rect(ctx, bx, by + 16, 34, 10, o.light === 4 ? '#3e3240' : '#e8e0d0');
  box(ctx, bx + 4, by + 18, 12, 8, '#7b4a6b');
  if (o.competitor) box(ctx, bx + 19, by + 18, 12, 7, '#f6c343');
  else for (let i = 0; i < 4; i++) rect(ctx, bx + 19 + i * 3, by + 20, 2, 2, ['#ee8a9e', '#f6c343', '#fff4de', '#c2453d'][i]);
  // second building and a tree
  rect(ctx, ix + 41, iy + 8, 18, 32, o.light === 4 ? '#4f5a66' : '#f6d38c');
  rect(ctx, ix + 41, iy + 8, 18, 2, PAL.ink);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) box(ctx, ix + 43 + c * 8, iy + 12 + r * 9, 6, 6, o.light >= 3 ? '#ffd98a' : '#bfe3ef');
  rect(ctx, ix + 37, iy + 24, 3, 18, PAL.coffee);
  for (const [tx, ty, r] of [[38, 18, 7], [33, 22, 5], [43, 22, 5]]) {
    ctx.fillStyle = o.light === 4 ? '#24442f' : PAL.pandan;
    ctx.beginPath();
    ctx.arc(ix + tx, iy + ty, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // sidewalk and road
  rect(ctx, ix, iy + 40, iw, 3, '#d8cdb4');
  rect(ctx, ix, iy + 43, iw, ih - 43, o.light === 4 ? '#3a3a44' : '#7d7a78');
  for (let i = 2; i < iw; i += 10) rect(ctx, ix + i, iy + 46, 5, 1, '#f2e6c8');
  if (o.decor.includes('bike')) {
    rect(ctx, ix + 48, iy + 36, 12, 1, PAL.ink);
    for (const wx of [ix + 48, ix + 58]) box(ctx, wx - 2, iy + 37, 5, 5, '#e8e0d0');
    box(ctx, ix + 46, iy + 32, 6, 4, '#ee8a9e');
  }
  ctx.restore();
}

/** The room's palette: off-white, light green and pink, with a warm wooden floor. */
const ROOM = {
  cornice: '#f2c4cf',
  wall: '#fcf8f1',
  wallStripe: '#f8e4e8',
  trim: '#f2b8c6',
  dado: '#d9ecdc',
  dadoPanel: '#e6f3e8',
  dadoLine: '#b7d6bf',
  lamp: '#f6c9d3',
  plank: '#d9a877',
  plankLine: '#b98556',
  plankHi: '#e8bf91',
  table: '#f6c6d0',
  tableRim: '#fff5f7',
  tableLeg: '#8c5a3c',
  chair: '#bfe0c4',
  chairLeg: '#7fa98a',
  counter: '#fbf7f0',
  counterTop: '#f2b8c6',
  counterPanel: '#e3f0e6',
  caseBase: '#f6c6d0',
  register: '#8fc79c',
  frame: '#8fc79c',
  sill: '#fff5f7',
  door: '#a8d6b0',
};

/** A little round café table with two chairs and a cake. (tx, ty) is the table's left/top. */
function cafeTable(ctx: CanvasRenderingContext2D, tx: number, ty: number) {
  for (const cx of [tx - 7, tx + 15]) {
    rect(ctx, cx, ty - 6, 6, 8, ROOM.chair);
    rect(ctx, cx, ty - 6, 6, 1, PAL.ink);
    rect(ctx, cx, ty + 2, 6, 1, ROOM.chairLeg);
    rect(ctx, cx + 1, ty + 3, 1, 5, ROOM.chairLeg);
    rect(ctx, cx + 4, ty + 3, 1, 5, ROOM.chairLeg);
  }
  rect(ctx, tx + 1, ty, 12, 1, PAL.ink);
  rect(ctx, tx, ty + 1, 14, 3, ROOM.table);
  rect(ctx, tx + 1, ty + 1, 12, 1, ROOM.tableRim);
  rect(ctx, tx, ty + 4, 14, 1, PAL.ink);
  rect(ctx, tx + 6, ty + 5, 2, 7, ROOM.tableLeg);
  rect(ctx, tx + 3, ty + 12, 8, 1, ROOM.tableLeg);
  // a slice of cake and a cup
  rect(ctx, tx + 3, ty - 3, 4, 3, PAL.mango);
  rect(ctx, tx + 3, ty - 3, 4, 1, PAL.pink);
  rect(ctx, tx + 9, ty - 2, 3, 2, PAL.coconut);
  rect(ctx, tx + 9, ty - 3, 3, 1, PAL.ink);
}

export function drawRoom(ctx: CanvasRenderingContext2D, o: SceneOpts) {
  const L = LAYOUT;
  // ceiling: a pink cornice; walls: off-white with faint pink stripes above a light-green wainscot
  rect(ctx, 0, 0, STAGE_W, 6, ROOM.cornice);
  rect(ctx, 0, 6, STAGE_W, 1, PAL.ink);
  rect(ctx, 0, 7, STAGE_W, 69, ROOM.wall);
  for (let x = 1; x < STAGE_W; x += 6) rect(ctx, x, 7, 2, 69, ROOM.wallStripe);
  rect(ctx, 0, 74, STAGE_W, 2, ROOM.trim);
  rect(ctx, 0, 76, STAGE_W, 20, ROOM.dado);
  for (let x = 4; x < STAGE_W; x += 24) {
    rect(ctx, x, 79, 16, 14, ROOM.dadoPanel);
    rect(ctx, x, 79, 16, 1, ROOM.dadoLine);
    rect(ctx, x, 79, 1, 14, ROOM.dadoLine);
  }
  rect(ctx, 0, 75, STAGE_W, 1, PAL.ink);
  // pendant lamps
  for (const lx of [62, 160]) {
    rect(ctx, lx + 4, 7, 1, 9, PAL.ink);
    rect(ctx, lx, 16, 9, 1, PAL.ink);
    rect(ctx, lx - 1, 17, 11, 4, ROOM.lamp);
    rect(ctx, lx - 1, 21, 11, 1, PAL.ink);
    rect(ctx, lx + 3, 22, 3, 1, '#fff6c8');
  }
  // wooden floor: planks with staggered joints
  rect(ctx, 0, L.floorY, STAGE_W, STAGE_H - L.floorY, ROOM.plank);
  for (let y = L.floorY; y < STAGE_H; y += 6) {
    rect(ctx, 0, y, STAGE_W, 1, ROOM.plankLine);
    rect(ctx, 0, y + 1, STAGE_W, 1, ROOM.plankHi);
    const off = ((y - L.floorY) / 6) % 2 ? 12 : 0;
    for (let x = off; x < STAGE_W; x += 24) rect(ctx, x, y + 1, 1, 5, ROOM.plankLine);
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
  rect(ctx, W.x + W.w / 2 - 1, W.y, 2, W.h, ROOM.frame);
  rect(ctx, W.x - 2, W.y + W.h, W.w + 4, 3, ROOM.sill);
  if (o.upgrades.includes('garden'))
    for (let i = 0; i < 4; i++) {
      box(ctx, W.x + 4 + i * 15, W.y + W.h - 5, 8, 5, PAL.orangeDark);
      rect(ctx, W.x + 5 + i * 15, W.y + W.h - 9, 6, 4, PAL.pandan);
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
  rect(ctx, B.x, B.y, B.w, B.h, '#2f3e36');
  rect(ctx, L.shelf.x - 2, L.shelf.y, L.shelf.w + 4, 3, PAL.crust);
  rect(ctx, L.shelf.x - 2, L.shelf.y + 3, L.shelf.w + 4, 1, PAL.ink);
  const jars = [PAL.mango, PAL.pink, PAL.leaf, PAL.coffee, PAL.orange];
  jars.forEach((c, i) => {
    box(ctx, L.shelf.x + 2 + i * 9, L.shelf.y - 8, 7, 8, '#e8f4f6');
    rect(ctx, L.shelf.x + 3 + i * 9, L.shelf.y - 5, 5, 4, c);
    rect(ctx, L.shelf.x + 2 + i * 9, L.shelf.y - 9, 7, 2, PAL.crust);
  });
  if (o.decor.includes('radio')) {
    box(ctx, L.shelf.x + 30, L.shelf.y - 9, 14, 9, PAL.red);
    rect(ctx, L.shelf.x + 32, L.shelf.y - 7, 5, 5, PAL.ink);
    rect(ctx, L.shelf.x + 39, L.shelf.y - 7, 3, 2, PAL.cream);
  }

  // lacquer art
  if (o.decor.includes('art')) {
    box(ctx, 158, 18, 32, 22, PAL.mango);
    rect(ctx, 160, 20, 28, 18, '#2a1a1a');
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
    box(ctx, F.x, F.y, F.w, F.h, '#f2f6f6');
    rect(ctx, F.x + 1, F.y + 13, F.w - 2, 1, PAL.ink);
    rect(ctx, F.x + F.w - 4, F.y + 4, 1, 6, PAL.stoneDark);
    rect(ctx, F.x + F.w - 4, F.y + 17, 1, 8, PAL.stoneDark);
  }

  // coffee station
  const C = L.coffee;
  box(ctx, C.x, C.y, C.w, C.h, ROOM.counter);
  rect(ctx, C.x + 1, C.y + 1, C.w - 2, 2, ROOM.counterTop);
  for (let i = 0; i < 2; i++) box(ctx, C.x + 3 + i * 14, C.y + 6, 12, 10, '#c98a4a');
  const phins = o.upgrades.includes('coffeeBar') ? 4 : 2;
  for (let i = 0; i < phins; i++) {
    const px = C.x + 3 + i * 7;
    box(ctx, px, C.y - 9, 6, 4, '#c8c8c8');
    box(ctx, px + 1, C.y - 5, 4, 5, '#d6eef5');
    rect(ctx, px + 2, C.y - 3, 2, 3, PAL.coffee);
  }
  box(ctx, C.x + C.w - 7, C.y - 7, 6, 7, PAL.red);
  rect(ctx, C.x + C.w - 6, C.y - 5, 4, 2, PAL.coconut);

  // oven
  const O = L.oven;
  box(ctx, O.x, O.y, O.w, O.h, o.upgrades.includes('oven3') ? '#9aa3a6' : o.upgrades.includes('oven2') ? '#c7a07a' : '#b5651d');
  for (let y = O.y + 3; y < O.y + O.h - 2; y += 5) for (let x = O.x + 2 + ((y / 5) % 2) * 3; x < O.x + O.w - 3; x += 7) rect(ctx, x, y, 5, 1, 'rgba(59,42,37,0.25)');
  box(ctx, O.x + 5, O.y + 14, O.w - 10, 20, '#3a221a');
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
    rect(ctx, 86, 126, 76, 8, '#d9b36a');
    for (let x = 88; x < 160; x += 4) rect(ctx, x, 128, 2, 4, '#b5651d');
    rect(ctx, 86, 126, 76, 1, PAL.crust);
  }
}

/** The counter sits in front of the player but behind customers. */
export function drawCounter(ctx: CanvasRenderingContext2D, o: SceneOpts) {
  const K = LAYOUT.counter;
  box(ctx, K.x, K.y, K.w, K.h, ROOM.counter);
  rect(ctx, K.x - 2, K.y - 2, K.w + 4, 3, ROOM.counterTop);
  rect(ctx, K.x - 2, K.y - 2, K.w + 4, 1, PAL.ink);
  for (let x = K.x + 4; x < K.x + K.w - 4; x += 12) {
    rect(ctx, x, K.y + 4, 9, 11, ROOM.counterPanel);
    rect(ctx, x, K.y + 4, 9, 1, ROOM.dadoLine);
    rect(ctx, x, K.y + 4, 1, 11, ROOM.dadoLine);
    rect(ctx, x + 3, K.y + 8, 3, 3, ROOM.trim);
  }
  const S = LAYOUT.case;
  rect(ctx, S.x, S.y, S.w, S.h, PAL.ink);
  rect(ctx, S.x + 1, S.y + 1, S.w - 2, S.h - 2, o.upgrades.includes('display') ? '#eef8f7' : '#fbf3ea');
  rect(ctx, S.x + 1, S.y + S.h - 4, S.w - 2, 3, ROOM.caseBase);
  for (let i = 0; i < 4; i++) rect(ctx, S.x + 4 + i * 2, S.y + 2 + i, 1, 4, 'rgba(255,255,255,0.9)');
  if (o.upgrades.includes('display')) rect(ctx, S.x + 1, S.y + 1, S.w - 2, 1, PAL.mango);
  const R = LAYOUT.register;
  box(ctx, R.x, R.y, R.w, R.h, ROOM.register);
  rect(ctx, R.x + 2, R.y + 2, R.w - 4, 3, '#cfe8f0');
  rect(ctx, R.x + 2, R.y + 7, R.w - 4, 1, PAL.ink);
  if (o.decor.includes('flowers')) {
    box(ctx, 180, 96, 6, 8, '#cfe8f0');
    for (const [fx, fy, c] of [[179, 92, PAL.pink], [183, 90, PAL.mango], [186, 93, PAL.red]] as const) rect(ctx, fx, fy, 3, 3, c);
  }
}

export function sceneSprite(ctx: CanvasRenderingContext2D, name: string, x: number, y: number) {
  sprite(ctx, name, x, y);
}
