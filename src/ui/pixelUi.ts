import { paint, spriteURL } from './pixel/render';

/**
 * The pixel UI kit's images are generated at start-up, not shipped: 9-slice panels for cards,
 * buttons and bubbles (outline, fill, baked drop shadow) and the custom cursor. They are drawn
 * at 1 CSS pixel per image pixel and used with border slices of the same size, so nothing is
 * ever resampled and the corners stay crisp at any zoom.
 */

const PANEL = { w: 16, h: 20, line: 3, shadow: 4 };

/** Rows of a panel: 'o' outline, 'f' fill, 's' shadow, '.' transparent. Corners are cut by a pixel step. */
function panelRows(shadow: boolean): string[] {
  const { w, h, line } = PANEL;
  const body = h - PANEL.shadow;
  const rows: string[] = [];
  for (let y = 0; y < body; y++) {
    let r = '';
    for (let x = 0; x < w; x++) {
      const edgeX = Math.min(x, w - 1 - x);
      const edgeY = Math.min(y, body - 1 - y);
      const corner = edgeX + edgeY < 2; // the pixel step on each corner
      const outline = edgeX < line || edgeY < line;
      r += corner ? '.' : outline ? 'o' : 'f';
    }
    rows.push(r);
  }
  for (let y = 0; y < PANEL.shadow; y++) rows.push(shadow ? '.' + 's'.repeat(w - 2) + '.' : '.'.repeat(w));
  return rows;
}

function toURL(rows: string[], colors: Record<string, string>): string {
  const cv = document.createElement('canvas');
  cv.width = Math.max(...rows.map((r) => r.length));
  cv.height = rows.length;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  paint(ctx, [rows], colors, 0, 0);
  return `url(${cv.toDataURL('image/png')})`;
}

const FILLS: Record<string, string> = {
  cream: '#eeede3',
  peach: '#f5d1b6',
  white: '#ffffff',
  aqua: '#bfded8',
  rose: '#ea7286',
  periwinkle: '#a3b2d2',
  matcha: '#a9c484',
  stone: '#a2a6a9',
  butter: '#e3e19f',
  pink: '#f4a4bf',
};

/** Set every panel and cursor as a CSS variable on <html>. Safe to call once at start-up. */
export function initPixelUi() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  const ink = '#58525a';
  for (const [name, fill] of Object.entries(FILLS)) {
    root.setProperty(`--px-${name}`, toURL(panelRows(true), { o: ink, f: fill, s: ink }));
    root.setProperty(`--px-${name}-flat`, toURL(panelRows(false), { o: ink, f: fill, s: ink }));
  }
  const spark = spriteURL('spark');
  if (spark.url) root.setProperty('--px-spark', `url(${spark.url})`);
  // cursor: a small pointing hand, hotspot at the fingertip
  const hand = spriteURL('cursorHand');
  if (hand.url) root.setProperty('--px-cursor', `url(${hand.url}) 4 1`);
}

/** A sparkle at every touch, unless motion is reduced. Desktop pointers get the cursor instead. */
export function initTouchSparkle() {
  if (typeof document === 'undefined') return;
  const spark = spriteURL('spark');
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType !== 'touch' || document.documentElement.dataset.motion === 'reduced' || !spark.url) return;
      const el = document.createElement('span');
      el.className = 'touch-spark';
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      for (let i = 0; i < 4; i++) {
        const img = document.createElement('img');
        img.src = spark.url;
        img.alt = '';
        img.className = `s${i}`;
        el.appendChild(img);
      }
      document.body.appendChild(el);
      window.setTimeout(() => el.remove(), 450);
    },
    { passive: true },
  );
}
