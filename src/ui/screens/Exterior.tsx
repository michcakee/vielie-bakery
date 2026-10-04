import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Look } from '../../engine/types';
import { PAL } from '../pixel/palette';
import { paint } from '../pixel/render';
import { SPRITE_COLORS } from '../pixel/palette';
import { SPRITES } from '../pixel/sprites';
import { Person, Sprite } from '../pixel/Sprite';
import { AWNINGS, SIGNS } from '../../data/shopfit';
import { cementTile } from '../pixel/decor';

/** How the front looks: the renovation level and the colours chosen in Paint. */
export interface Front {
  tier?: number;
  awning?: number;
  sign?: number;
}

const W = 240;
const H = 135;

function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}
function b(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  r(ctx, x, y, w, h, PAL.ink);
  r(ctx, x + 1, y + 1, w - 2, h - 2, c);
}

function shutters(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  b(ctx, x, y, w, h, '#f2e2bd');
  b(ctx, x - 4, y, 5, h, c);
  b(ctx, x + w - 1, y, 5, h, c);
  for (let i = y + 2; i < y + h - 1; i += 2) {
    r(ctx, x - 3, i, 3, 1, 'rgba(0,0,0,0.15)');
    r(ctx, x + w, i, 3, 1, 'rgba(0,0,0,0.15)');
  }
  r(ctx, x + w / 2, y, 1, h, PAL.ink);
}

function railing(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  r(ctx, x, y, w, 2, PAL.ink);
  for (let i = x + 1; i < x + w; i += 3) r(ctx, i, y + 2, 1, 6, PAL.ink);
  r(ctx, x, y + 8, w, 1, PAL.ink);
}

function pot(ctx: CanvasRenderingContext2D, x: number, y: number, flower?: string) {
  b(ctx, x, y, 6, 5, PAL.orangeDark);
  ctx.fillStyle = PAL.pandan;
  ctx.beginPath();
  ctx.arc(x + 3, y - 2, 4, 0, Math.PI * 2);
  ctx.fill();
  if (flower) for (const [dx, dy] of [[1, -4], [4, -3], [2, -1]]) r(ctx, x + dx, y + dy, 2, 2, flower);
}

/** The bakery's street front: a narrow Vietnamese tube house between two neighbours. */
export function drawExterior(ctx: CanvasRenderingContext2D, front: Front = {}) {
  const tier = front.tier ?? 0;
  const awning = (AWNINGS[front.awning ?? 0] ?? AWNINGS[0]).c;
  const sign = SIGNS[front.sign ?? 0] ?? SIGNS[0];
  const sky = ctx.createLinearGradient(0, 0, 0, 110);
  sky.addColorStop(0, '#f7f0dc');
  sky.addColorStop(1, '#f7f0dc');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // far skyline
  for (const [x, w, h] of [[0, 18, 40], [16, 14, 52], [176, 20, 46], [200, 16, 60], [222, 18, 42]]) r(ctx, x, 110 - h, w, h, '#dde7c4');

  // left neighbour: flower shop
  b(ctx, 6, 38, 62, 74, '#dde7c4');
  r(ctx, 6, 36, 62, 3, PAL.ink);
  shutters(ctx, 22, 46, 30, 18, '#9dbf78');
  railing(ctx, 10, 66, 54);
  pot(ctx, 14, 62, PAL.pink);
  pot(ctx, 52, 62, PAL.mango);
  for (let i = 0; i < 62; i++) r(ctx, 6 + i, 78, 1, 6, i % 8 < 4 ? '#9dbf78' : PAL.coconut);
  b(ctx, 12, 86, 50, 26, '#f7f0dc');
  for (let i = 0; i < 6; i++) {
    b(ctx, 14 + i * 8, 100, 6, 8, PAL.orangeDark);
    for (let j = 0; j < 3; j++) r(ctx, 14 + i * 8 + j * 2, 96 - (j % 2), 2, 2, [PAL.pink, PAL.mango, PAL.red, PAL.coconut][(i + j) % 4]);
  }

  // right neighbour: grocery
  b(ctx, 172, 30, 62, 82, '#f7f0dc');
  r(ctx, 172, 28, 62, 3, PAL.ink);
  shutters(ctx, 188, 38, 30, 18, '#9dbf78');
  shutters(ctx, 188, 60, 30, 14, '#9dbf78');
  b(ctx, 214, 40, 12, 8, PAL.stone);
  for (let i = 0; i < 62; i++) r(ctx, 172 + i, 80, 1, 5, i % 8 < 4 ? '#dde7c4' : PAL.coconut);
  b(ctx, 178, 88, 50, 24, '#f7f0dc');
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) b(ctx, 181 + i * 9, 92 + j * 9, 7, 7, [PAL.mango, PAL.red, PAL.pandan, PAL.orange, PAL.pink][(i + j) % 5]);

  // the bakery: three narrow floors
  const x0 = 70;
  const bw = 100;
  b(ctx, x0, 8, bw, 104, '#f7f0dc');
  for (let y = 10; y < 110; y += 4) r(ctx, x0 + 1, y, bw - 2, 1, 'rgba(143,199,156,0.22)');
  // roof
  r(ctx, x0 - 4, 4, bw + 8, 6, '#9dbf78');
  for (let i = x0 - 4; i < x0 + bw + 4; i += 4) r(ctx, i, 4, 1, 6, '#4f7d46');
  r(ctx, x0 - 4, 3, bw + 8, 1, PAL.ink);
  r(ctx, x0 - 4, 10, bw + 8, 1, PAL.ink);
  // top floor: arched window + AC unit
  b(ctx, x0 + 34, 14, 32, 22, '#f7f0dc');
  ctx.fillStyle = PAL.ink;
  ctx.beginPath();
  ctx.arc(x0 + 50, 16, 16, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#f7f0dc';
  ctx.beginPath();
  ctx.arc(x0 + 50, 16, 15, Math.PI, 0);
  ctx.fill();
  r(ctx, x0 + 50, 2, 1, 34, PAL.ink);
  b(ctx, x0 + 72, 22, 16, 10, PAL.stone);
  for (let i = 0; i < 4; i++) r(ctx, x0 + 74, 24 + i * 2, 12, 1, PAL.stoneDark);
  // middle floor: balcony with plants
  shutters(ctx, x0 + 30, 40, 40, 20, '#9dbf78');
  r(ctx, x0 + 8, 60, bw - 16, 3, '#dde7c4');
  railing(ctx, x0 + 8, 52, bw - 16);
  pot(ctx, x0 + 12, 48, PAL.pink);
  pot(ctx, x0 + 24, 48);
  pot(ctx, x0 + 74, 48, PAL.mango);
  pot(ctx, x0 + 84, 48, PAL.red);
  // hanging lanterns under the balcony (grand bakery)
  if (tier >= 4)
    for (const lx of [x0 + 18, x0 + 46, x0 + 78]) {
      r(ctx, lx + 2, 61, 1, 2, PAL.ink);
      b(ctx, lx, 63, 5, 5, '#d0634f');
      r(ctx, lx + 2, 68, 1, 1, '#e3b23c');
    }
  // sign board
  b(ctx, x0 + 10, 64, bw - 20, 12, sign.c);
  r(ctx, x0 + 12, 66, bw - 24, 8, sign.c);
  if (tier >= 4) {
    // light bulbs all the way round
    for (let i = x0 + 11; i < x0 + bw - 10; i += 4) {
      r(ctx, i, 64, 1, 1, '#f4dc8c');
      r(ctx, i, 75, 1, 1, '#f4dc8c');
    }
    r(ctx, x0 - 4, 3, bw + 8, 1, '#e3b23c');
  }
  // awning with scallops
  for (let i = 0; i < bw + 8; i++) r(ctx, x0 - 4 + i, 78, 1, 7, Math.floor(i / 6) % 2 ? PAL.coconut : awning);
  r(ctx, x0 - 4, 77, bw + 8, 1, PAL.ink);
  for (let i = 0; i < bw + 8; i += 6) {
    ctx.fillStyle = Math.floor(i / 6) % 2 ? PAL.coconut : awning;
    ctx.beginPath();
    ctx.arc(x0 - 1 + i, 85, 3, 0, Math.PI);
    ctx.fill();
  }
  // shop window with pastries and door
  b(ctx, x0 + 6, 90, 56, 22, '#f7f0dc');
  r(ctx, x0 + 7, 101, 54, 1, PAL.crust);
  // each pastry sits on the shelf: line its lowest drawn row up with the shelf top
  for (const [i, n] of ['banhMi', 'banhMiQue', 'flan'].entries()) {
    const rows = SPRITES[n];
    const last = rows.reduce((k, row, y) => (/[^.]/.test(row) ? y : k), 0);
    paint(ctx, [rows], SPRITE_COLORS, x0 + 8 + i * 17, 101 - (last + 1));
  }
  r(ctx, x0 + 10, 92, 3, 6, 'rgba(255,255,255,0.7)');
  if (tier >= 3) for (let x = x0 + 1; x < x0 + bw - 1; x += 4) cementTile(ctx, x, 108, 4, ((x - x0) / 4) % 2);
  if (tier >= 1)
    // brass wall lamps either side of the door
    for (const lx of [x0 + 64, x0 + 93]) {
      r(ctx, lx, 90, 3, 4, '#e3b23c');
      r(ctx, lx + 1, 94, 1, 1, PAL.ink);
    }
  b(ctx, x0 + 68, 88, 24, 24, '#9dbf78');
  b(ctx, x0 + 71, 91, 18, 10, '#f7f0dc');
  r(ctx, x0 + 85, 103, 2, 2, PAL.mango);
  b(ctx, x0 + 73, 93, 14, 6, PAL.cream);

  // power lines and poles
  r(ctx, 2, 20, 3, 92, '#6b7560');
  r(ctx, 235, 14, 3, 98, '#6b7560');
  ctx.fillStyle = 'rgba(59,42,37,0.7)';
  for (let x = 3; x < 236; x++) {
    const t = (x - 3) / 233;
    ctx.fillRect(x, 22 + Math.round(9 * Math.sin(t * Math.PI)) - Math.round(t * 6), 1, 1);
    ctx.fillRect(x, 26 + Math.round(11 * Math.sin(t * Math.PI)) - Math.round(t * 6), 1, 1);
  }
  // tree
  r(ctx, 228, 70, 4, 42, PAL.coffee);
  ctx.fillStyle = PAL.pandan;
  for (const [cx, cy, rad] of [[230, 62, 12], [221, 70, 8], [238, 70, 8]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // sidewalk and street
  r(ctx, 0, 112, W, 1, PAL.ink);
  for (let y = 113; y < 124; y += 4) for (let x = (y % 8) * 2; x < W; x += 8) b(ctx, x, y, 8, 4, '#f7f0dc');
  r(ctx, 0, 124, W, 11, '#aab39a');
  for (let x = 4; x < W; x += 16) r(ctx, x, 129, 8, 1, '#f2e2bd');
  // a parasol over the pavement café (neighbourhood café and up)
  if (tier >= 2) {
    r(ctx, 46, 92, 1, 16, PAL.ink);
    for (let i = 0; i < 22; i++) r(ctx, 36 + i, 88 + Math.round(Math.abs(i - 11) / 3), 1, 3, Math.floor(i / 4) % 2 ? PAL.coconut : awning);
    r(ctx, 35, 87, 24, 1, PAL.ink);
  }
  // stools and a table on the sidewalk
  b(ctx, 40, 106, 14, 3, PAL.red);
  r(ctx, 42, 109, 2, 4, PAL.red);
  r(ctx, 50, 109, 2, 4, PAL.red);
  for (const sx of [32, 57]) {
    b(ctx, sx, 108, 6, 2, PAL.teal);
    r(ctx, sx + 1, 110, 1, 3, PAL.teal);
    r(ctx, sx + 4, 110, 1, 3, PAL.teal);
  }
}

const WALKERS: Look[] = [
  { skin: 1, hair: 0, hairColor: 0, shirt: 4, apron: -1, accessory: 1 },
  { skin: 3, hair: 2, hairColor: 0, shirt: 1, apron: -1, accessory: 0 },
  { skin: 0, hair: 3, hairColor: 2, shirt: 3, apron: -1, accessory: 2 },
];

export function Exterior({ still = false, front, name = 'Viet Bake Shop' }: { still?: boolean; front?: Front; name?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);
      drawExterior(ctx, front);
    }
  }, [front?.tier, front?.awning, front?.sign]);
  // Integer device-pixel scale, letterboxed in the wrapper.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      setK(Math.max(1, Math.floor((el.clientWidth * dpr) / W)) / dpr);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, []);
  return (
    <div className="exterior" aria-hidden="true" ref={box}>
      <div className="ext-stage" style={{ width: W * k, height: H * k }}>
        <canvas ref={ref} width={W} height={H} />
        <div className="ext-sign" style={{ color: (SIGNS[front?.sign ?? 0] ?? SIGNS[0]).text, fontSize: `${Math.min(4, 56 / Math.max(14, name.length))}cqw` }}>
          {name}
        </div>
        {!still && (
          <>
            <div className="ext-cloud c1" />
            <div className="ext-cloud c2" />
            <div className="ext-cloud c3" />
            <div className="ext-bird b1">
              <Sprite name="spark" scale={1} />
            </div>
            {WALKERS.map((l, i) => (
              <div key={i} className={`ext-walker w${i}`}>
                <Person look={l} scale={1} walking />
              </div>
            ))}
            <div className="ext-moto">
              <Sprite name="motoFlowers" scale={1} />
            </div>
            <div className="ext-steam">
              <i />
              <i />
              <i />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
