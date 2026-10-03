/**
 * Generates every app icon and splash screen from the logo: a smiling pixel bánh flan.
 * No dependencies: a tiny PNG encoder on top of node:zlib.
 *
 *   node scripts/make-icons.mjs
 *
 * Writes public/icons/* (PWA), resources/* (store art) and, when the native projects exist,
 * overwrites the Capacitor placeholder icons and splashes in android/ and ios/ at their existing sizes.
 */
import { deflateSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const src = (p) => readFileSync(join(root, p), 'utf8');

// ---------------------------------------------------------------- the logo: a smiling bánh flan on a plate
const palSrc = src('src/ui/pixel/palette.ts');
const PAL = Object.fromEntries([...palSrc.matchAll(/^\s+(\w+): '(#[0-9a-f]{6})',/gim)].map((m) => [m[1], m[2]]));
const LOGO = [
  '.....oooooo.....',
  '....occllcco....',
  '...occcccccco...',
  '...oycyyycyyo...',
  '..oyhyyyyyyyyo..',
  '..oyyoyyyyoyyo..',
  '..oypyyooyypyo..',
  '.odyyyyyyyyyydo.',
  '.oddyyyyyyyyddo.',
  '.oooooooooooooo.',
  'owwwwwwwwwwwwwwo',
  '.oggggggggggggo.',
  '..oooooooooooo..',
];
const CODES = {
  o: '#3b2a25', // outline
  c: '#b5612a', // caramel
  l: '#d98a3e', // caramel shine
  y: '#f5d57a', // custard
  h: '#fff0c0', // custard highlight
  d: '#e8b955', // custard shadow
  p: '#f2a0b8', // blush
  w: '#ffffff', // plate
  g: '#c5d5c7', // plate shadow
};
/** Twinkles beside the flan, in logo cells: centre (x, y) and the size of one twinkle pixel. */
const SPARKLES = [
  { x: -2.65, y: 1.7, cell: 0.45 },
  { x: 18.85, y: 6.5, cell: 0.72 },
];
const SPARKLE = ['..y..', '..y..', 'yywyy', '..y..', '..y..'];
const SPARKLE_COLORS = { y: '#f2c94c', w: '#ffffff' };
const GREEN = '#d7ecca';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BG = hex(GREEN);
const SPLASH_BG = hex(GREEN);

// ---------------------------------------------------------------- PNG encoder
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(w, h, rgba, alpha) {
  const ch = alpha ? 4 : 3;
  const raw = Buffer.alloc((w * ch + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * ch + 1)] = 0;
    for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) raw[y * (w * ch + 1) + 1 + x * ch + c] = rgba[(y * w + x) * 4 + c];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = alpha ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- drawing
function canvas(w, h, fill) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) px.set(fill ?? [0, 0, 0, 0], i * 4);
  return { w, h, px };
}
const set = (c, x, y, rgb, a = 255) => {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  c.px.set([...rgb, a], (y * c.w + x) * 4);
};
/** Rounded square / circle mask in pixel-art steps. */
function blob(c, cx, cy, r, rgb, radius) {
  for (let y = Math.floor(cy - r); y < cy + r; y++)
    for (let x = Math.floor(cx - r); x < cx + r; x++) {
      const dx = Math.max(Math.abs(x + 0.5 - cx) - (r - radius), 0);
      const dy = Math.max(Math.abs(y + 0.5 - cy) - (r - radius), 0);
      if (dx * dx + dy * dy <= radius * radius) set(c, x, y, rgb);
    }
}
/** The flan and its twinkles, centred on (cx, cy), the flan `width` pixels wide (whole pixels per cell). */
function logo(c, cx, cy, width, { sparkles = true } = {}) {
  const cols = LOGO[0].length;
  const s = Math.max(1, Math.floor(width / cols));
  const x0 = Math.round(cx - (cols * s) / 2);
  const y0 = Math.round(cy - (LOGO.length * s) / 2);
  LOGO.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      const col = CODES[ch];
      if (!col) return;
      for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) set(c, x0 + i * s + xx, y0 + j * s + yy, hex(col));
    }),
  );
  if (!sparkles) return;
  for (const sp of SPARKLES) {
    const k = Math.max(1, Math.round(s * sp.cell));
    const sx = Math.round(x0 + sp.x * s - (5 * k) / 2);
    const sy = Math.round(y0 + sp.y * s - (5 * k) / 2);
    SPARKLE.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        const col = SPARKLE_COLORS[ch];
        if (!col) return;
        for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) set(c, sx + i * k + xx, sy + j * k + yy, hex(col));
      }),
    );
  }
}

/** The app icon: the flan on light green. `inset` shrinks the art for maskable/adaptive safe zones. */
function icon(size, { inset = 1, transparent = false, background = true, rounded = false } = {}) {
  const c = canvas(size, size, transparent ? null : [...BG, 255]);
  if (background && transparent) blob(c, size / 2, size / 2, size / 2, BG, rounded ? size / 2 : size * 0.22);
  // The flan plus its twinkles span about 24 cells; keep them inside the safe area.
  logo(c, size / 2, size / 2, size * 0.54 * inset);
  return c;
}
function splash(w, h) {
  const c = canvas(w, h, [...SPLASH_BG, 255]);
  logo(c, w / 2, h / 2, Math.min(w, h) * 0.3);
  return c;
}

const write = (path, c, alpha = false) => {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, png(c.w, c.h, c.px, alpha));
  console.log('wrote', path, `${c.w}x${c.h}`);
};
const sizeOf = (path) => {
  const b = readFileSync(join(root, path));
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

// ---------------------------------------------------------------- PWA + store art
write('public/icons/icon-192.png', icon(192, { transparent: true }), true);
write('public/icons/icon-512.png', icon(512, { transparent: true }), true);
write('public/icons/icon-maskable-512.png', icon(512, { inset: 0.8 }));
write('public/icons/apple-touch-icon.png', icon(180));
write('public/favicon.png', icon(64, { transparent: true }), true);
write('resources/icon-1024.png', icon(1024)); // App Store / Play (no alpha)
write('resources/play-feature-1024x500.png', splash(1024, 500));
write('resources/splash-2732.png', splash(2732, 2732));

// ---------------------------------------------------------------- Android
const res = 'android/app/src/main/res';
if (existsSync(join(root, res))) {
  for (const dir of readdirSync(join(root, res))) {
    for (const f of readdirSync(join(root, res, dir))) {
      const p = `${res}/${dir}/${f}`;
      if (!f.endsWith('.png')) continue;
      const [w, h] = sizeOf(p);
      if (f === 'splash.png') write(p, splash(w, h));
      else if (f === 'ic_launcher_foreground.png') write(p, icon(w, { inset: 0.62, transparent: true, background: false }), true);
      else if (f === 'ic_launcher_round.png') write(p, icon(w, { transparent: true, rounded: true, inset: 0.9 }), true); else if (f === 'ic_launcher.png') write(p, icon(w, { transparent: true }), true);
    }
  }
  const bg = `${res}/values/ic_launcher_background.xml`;
  writeFileSync(join(root, bg), readFileSync(join(root, bg), 'utf8').replace(/#[0-9A-Fa-f]{6}/, GREEN.toUpperCase()));
}

// ---------------------------------------------------------------- iOS
const ios = 'ios/App/App/Assets.xcassets';
if (existsSync(join(root, ios))) {
  write(`${ios}/AppIcon.appiconset/AppIcon-512@2x.png`, icon(1024));
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) write(`${ios}/Splash.imageset/${f}`, splash(2732, 2732));
}

// ---------------------------------------------------------------- favicon.svg (crisp at any size)
{
  const cells = [];
  LOGO.forEach((row, j) => [...row].forEach((ch, i) => CODES[ch] && cells.push(`<rect x="${i + 2}" y="${j + 3.5}" width="1" height="1" fill="${CODES[ch]}"/>`)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" shape-rendering="crispEdges"><rect width="20" height="20" rx="4" fill="${GREEN}"/>${cells.join('')}</svg>
`;
  writeFileSync(join(root, 'public/favicon.svg'), svg);
  console.log('wrote public/favicon.svg');
}
