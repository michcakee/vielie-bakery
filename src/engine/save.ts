import { INGREDIENT_ORDER, PRODUCT_ORDER } from '../data/catalog';
import { SAVE_VERSION } from './state';
import type { GameState } from './types';

export const SAVE_KEY = 'vielie-bakery-save-v2';
export const PREFS_KEY = 'vielie-bakery-prefs-v2';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** Reject anything that would break the game: wrong version, NaN money, negative stock. */
export function validSave(data: unknown): data is GameState {
  const s = data as GameState;
  if (!s || typeof s !== 'object' || s.version !== SAVE_VERSION) return false;
  if (!finite(s.day) || s.day < 1 || !finite(s.cash) || !finite(s.safetyFund) || !finite(s.xp)) return false;
  if (!s.pantry || !s.display || !s.prices || !s.market || !Array.isArray(s.history) || !s.today) return false;
  for (const id of INGREDIENT_ORDER) if (!s.pantry[id] || !finite(s.pantry[id].qty) || s.pantry[id].qty < 0) return false;
  for (const p of PRODUCT_ORDER) {
    if (!s.display[p] || !finite(s.display[p].qty) || s.display[p].qty < 0) return false;
    if (!finite(s.prices[p]) || s.prices[p] <= 0) return false;
  }
  return true;
}

/** Saves taken mid-service resume at the start of that day's service rather than mid-rush. */
export function forStorage(s: GameState): GameState {
  return { ...s, toasts: [] };
}

export function saveGame(s: GameState, store: StorageLike | null = storage()): boolean {
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(forStorage(s)));
    return true;
  } catch (e) {
    console.error('[vielie] save failed', e);
    return false;
  }
}

export function loadGame(store: StorageLike | null = storage()): GameState | null {
  if (!store) return null;
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return validSave(data) ? data : null;
  } catch (e) {
    console.error('[vielie] save unreadable', e);
    return null;
  }
}

export function hasOldSave(store: StorageLike | null = storage()): boolean {
  try {
    return !!store?.getItem('vielie-bakery-save-v1');
  } catch {
    return false;
  }
}

export function clearSave(store: StorageLike | null = storage()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------- save codes

const toB64 = (bytes: Uint8Array) => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64 = (code: string) => {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** A compact, copy-pasteable code holding the whole bakery. */
export async function exportCode(s: GameState): Promise<string> {
  const lean: GameState = { ...forStorage(s), history: s.history.slice(-21), ecoHistory: s.ecoHistory.slice(-7), service: s.phase === 'service' ? s.service : null, lastReport: null };
  const json = new TextEncoder().encode(JSON.stringify(lean));
  if (typeof CompressionStream !== 'undefined') return 'z' + toB64(await pipe(json, new CompressionStream('deflate-raw')));
  return 'j' + toB64(json);
}

export async function importCode(code: string): Promise<GameState | null> {
  try {
    const c = code.trim();
    const bytes = fromB64(c.slice(1));
    const raw = c[0] === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
    const data = JSON.parse(new TextDecoder().decode(raw));
    if (!validSave(data)) return null;
    return { ...data, lastReport: null };
  } catch (e) {
    console.error('[vielie] bad save code', e);
    return null;
  }
}

export function restoreLink(code: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#restore=${code}`;
}

// ---------------------------------------------------------------- prefs

export interface Prefs {
  reducedMotion: boolean;
  sound: boolean;
  music: boolean;
  relaxed: boolean;
  email: string;
  translations: boolean;
}

export const DEFAULT_PREFS: Prefs = { reducedMotion: false, sound: true, music: true, relaxed: false, email: '', translations: true };

export function loadPrefs(): Prefs {
  try {
    const raw = storage()?.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(p: Prefs): void {
  try {
    storage()?.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
