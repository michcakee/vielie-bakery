import { SAVE_VERSION } from './state';
import type { GameState } from './types';

export const SAVE_KEY = 'vielie-bakery-save-v1';
export const PREFS_KEY = 'vielie-bakery-prefs-v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function storage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState, store: StorageLike | null = storage()): boolean {
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Load and sanity-check a save. Returns null for missing, corrupt or outdated saves. */
export function loadGame(store: StorageLike | null = storage()): GameState | null {
  if (!store) return null;
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    if (data?.version !== SAVE_VERSION || typeof data.day !== 'number' || typeof data.cash !== 'number' || !data.market || !Array.isArray(data.history)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSave(store: StorageLike | null = storage()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

export interface Prefs {
  reducedMotion: boolean;
}

export function loadPrefs(): Prefs {
  try {
    const raw = storage()?.getItem(PREFS_KEY);
    return raw ? { reducedMotion: false, ...JSON.parse(raw) } : { reducedMotion: false };
  } catch {
    return { reducedMotion: false };
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    storage()?.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
