/**
 * Generates every app icon and splash screen from the game's own pixel bánh mì sprite.
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

// ---------------------------------------------------------------- read the sprite + palette from source
const palSrc = src('src/ui/pixel/palette.ts');
const PAL = Object.fromEntries([...palSrc.matchAll(/^\s+(\w+): '(#[0-9a-f]{6})',/gim)].map((m) => [m[1], m[2]]));
const codeBlock = palSrc.slice(palSrc.indexOf('SPRITE_COLORS'));
const CODES = Object.fromEntries([...codeBlock.slice(0, codeBlock.indexOf('};')).matchAll(/^\s+(\w): PAL\.(\w+),/gm)].map((m) => [m[1], PAL[m[2]]]));
const spriteSrc = src('src/ui/pixel/sprites.ts');
const body = spriteSrc.slice(spriteSrc.indexOf('banhMi: ['));
const SPRITE = [...body.slice(0, body.indexOf(']')).matchAll(/'([^']+)'/g)].map((m) => m[1]);
// trim fully transparent rows so the loaf is centred
while (SPRITE[0] && /^\.+$/.test(SPRITE[0])) SPRITE.shift();

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BG = hex(PAL.forest);
const CREAM = hex(PAL.paper);
const SPLASH_BG = hex('#f7e6c6');

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
function sprite(c, cx, cy, width) {
  const cols = Math.max(...SPRITE.map((r) => r.length));
  const s = Math.max(1, Math.floor(width / cols));
  const x0 = Math.round(cx - (cols * s) / 2);
  const y0 = Math.round(cy - (SPRITE.length * s) / 2);
  SPRITE.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      const col = CODES[ch];
      if (!col) return;
      for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) set(c, x0 + i * s + xx, y0 + j * s + yy, hex(col));
    }),
  );
}

/** The app icon: cream disc on forest green with the loaf. `inset` shrinks art for maskable/adaptive safe zones. */
function icon(size, { inset = 1, transparent = false, background = true } = {}) {
  const c = canvas(size, size, transparent ? null : [...BG, 255]);
  const r = (size / 2) * inset;
  if (background && transparent) blob(c, size / 2, size / 2, size / 2, BG, size * 0.22);
  blob(c, size / 2, size / 2, r * 0.78, CREAM, r * 0.78);
  sprite(c, size / 2, size / 2 + size * 0.01, r * 1.1);
  return c;
}
function splash(w, h) {
  const c = canvas(w, h, [...SPLASH_BG, 255]);
  const d = Math.min(w, h) * 0.34;
  blob(c, w / 2, h / 2, d / 2, BG, d * 0.22);
  blob(c, w / 2, h / 2, (d / 2) * 0.78, CREAM, (d / 2) * 0.78);
  sprite(c, w / 2, h / 2, (d / 2) * 1.1);
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
      else if (f === 'ic_launcher_round.png') {
        const c = canvas(w, w);
        blob(c, w / 2, w / 2, w / 2, BG, w / 2);
        blob(c, w / 2, w / 2, (w / 2) * 0.78, CREAM, (w / 2) * 0.78);
        sprite(c, w / 2, w / 2, (w / 2) * 1.1);
        write(p, c, true);
      } else if (f === 'ic_launcher.png') write(p, icon(w, { transparent: true }), true);
    }
  }
  const bg = `${res}/values/ic_launcher_background.xml`;
  writeFileSync(join(root, bg), readFileSync(join(root, bg), 'utf8').replace(/#[0-9A-Fa-f]{6}/, PAL.forest.toUpperCase()));
}

// ---------------------------------------------------------------- iOS
const ios = 'ios/App/App/Assets.xcassets';
if (existsSync(join(root, ios))) {
  write(`${ios}/AppIcon.appiconset/AppIcon-512@2x.png`, icon(1024));
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) write(`${ios}/Splash.imageset/${f}`, splash(2732, 2732));
}
